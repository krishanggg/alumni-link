<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Backup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BackupService
{
    private const MAX_BACKUPS = 10;

    private const FILENAME_PATTERN = 'alumnilink_backup_';

    /** Statement separator for the text-dump fallback (see dumpSqliteToText). */
    private const DUMP_DELIMITER = ";\n-- @@alumnilink-statement@@ --\n";

    private string $disk;

    private string $dbConnection;

    private \Closure $commandRunner;

    private \Closure $binaryResolver;

    public function __construct(?\Closure $commandRunner = null, ?\Closure $binaryResolver = null)
    {
        $this->disk = 'local';
        $this->dbConnection = config('database.default');
        $this->commandRunner = $commandRunner ?? static function (string $command, array &$output, int &$resultCode): void {
            $process = proc_open($command, [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ], $pipes);

            if (! is_resource($process)) {
                $output = ['Could not start the MySQL process.'];
                $resultCode = 1;

                return;
            }

            fclose($pipes[0]);
            $stdout = stream_get_contents($pipes[1]);
            fclose($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[2]);
            $resultCode = proc_close($process);
            $output = preg_split('/\R/', trim($stdout.PHP_EOL.$stderr), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        };
        $this->binaryResolver = $binaryResolver ?? fn (string $tool): string => $this->resolveMysqlBinary($tool);
    }

    public function create(?int $userId): Backup
    {
        $filename = self::FILENAME_PATTERN.now()->format('Y-m-d_His').'.sql.gz';
        $path = 'backups/'.$filename;

        Storage::disk($this->disk)->makeDirectory('backups');

        if ($this->dbConnection === 'sqlite') {
            $this->createSqliteBackup($path);
        } else {
            $this->createMysqlBackup($path);
        }

        $fileSize = Storage::disk($this->disk)->size($path);

        $backup = Backup::create([
            'filename' => $filename,
            'file_path' => $path,
            'file_size' => $fileSize,
            'created_by' => $userId,
            'created_at' => now(),
        ]);

        $this->enforceRetention();

        return $backup;
    }

    public function delete(Backup $backup): void
    {
        if (Storage::disk($this->disk)->exists($backup->file_path)) {
            Storage::disk($this->disk)->delete($backup->file_path);
        }

        $backup->delete();
    }

    public function restore(Backup $backup): void
    {
        $path = Storage::disk($this->disk)->path($backup->file_path);

        if (! file_exists($path)) {
            throw new \RuntimeException('Backup file not found.');
        }

        if ($this->dbConnection === 'sqlite') {
            $this->restoreSqliteWithSafetyBackup($path);
        } else {
            $this->restoreMysqlWithSafetyBackup($path);
        }
    }

    public function downloadPath(Backup $backup): string
    {
        $path = Storage::disk($this->disk)->path($backup->file_path);

        if (! file_exists($path)) {
            throw new \RuntimeException('Backup file not found.');
        }

        return $path;
    }

    private function createSqliteBackup(string $storagePath): void
    {
        $dbPath = config('database.connections.sqlite.database');
        $targetPath = Storage::disk($this->disk)->path($storagePath);

        if ($dbPath === ':memory:' || ! file_exists($dbPath)) {
            $this->writeGzip($targetPath, $this->dumpSqliteToText());

            return;
        }

        // VACUUM INTO writes a transactionally-consistent snapshot of the live
        // database to a fresh file without blocking writers — unlike a raw
        // file copy, which can capture a half-written page or miss a
        // still-uncheckpointed WAL. The target must not already exist.
        $snapshot = $targetPath.'.snapshot';
        @unlink($snapshot);

        try {
            DB::connection()->getPdo()->exec('VACUUM INTO '.$this->quoteSqliteString($snapshot));

            $bytes = file_get_contents($snapshot);
            if ($bytes === false) {
                throw new \RuntimeException('Could not read the database snapshot.');
            }

            $this->writeGzip($targetPath, $bytes);
        } finally {
            @unlink($snapshot);
        }
    }

    private function writeGzip(string $path, string $contents): void
    {
        if (file_put_contents($path, gzencode($contents, 9)) === false) {
            throw new \RuntimeException('Could not write the backup file.');
        }
    }

    private function quoteSqliteString(string $value): string
    {
        return "'".str_replace("'", "''", $value)."'";
    }

    /**
     * Text dump used only when there is no database file to snapshot (the
     * in-memory driver used by the test suite). Statements are joined with an
     * explicit delimiter rather than ";\n" so a row value that happens to
     * contain a semicolon-newline can't split one statement into two.
     */
    private function dumpSqliteToText(): string
    {
        $pdo = DB::connection()->getPdo();
        $statements = [];
        $tables = [];

        // Schema: tables before indexes/triggers/views so the INSERTs below
        // have somewhere to land and index maintenance happens once at the end.
        $objects = $pdo->query(
            "SELECT type, name, sql FROM sqlite_master
             WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
             ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 ELSE 3 END, name"
        );

        foreach ($objects as $object) {
            $statements[] = $object['sql'];
            if ($object['type'] === 'table') {
                $tables[] = $object['name'];
            }
        }

        foreach ($tables as $table) {
            $quotedTable = '"'.str_replace('"', '""', $table).'"';
            $rows = $pdo->query("SELECT * FROM {$quotedTable}");
            while ($data = $rows->fetch(\PDO::FETCH_ASSOC)) {
                $columns = implode(', ', array_map(
                    fn ($column) => '"'.str_replace('"', '""', (string) $column).'"',
                    array_keys($data),
                ));
                $values = implode(', ', array_map(
                    fn ($value) => $value === null ? 'NULL' : $pdo->quote((string) $value),
                    $data,
                ));
                $statements[] = "INSERT INTO {$quotedTable} ({$columns}) VALUES ({$values})";
            }
        }

        return implode(self::DUMP_DELIMITER, $statements);
    }

    private function createMysqlBackup(string $storagePath): void
    {
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');
        $database = config('database.connections.mysql.database');
        $username = config('database.connections.mysql.username');

        $targetPath = Storage::disk($this->disk)->path($storagePath);
        $password = (string) config('database.connections.mysql.password');
        $temporarySqlPath = tempnam(sys_get_temp_dir(), 'alumnilink-dump-');

        if ($temporarySqlPath === false) {
            throw new \RuntimeException('Could not create a temporary MySQL dump file.');
        }

        try {
            $dumpBinary = ($this->binaryResolver)('dump');

            $this->withMysqlCredentials($password, function (string $credentialsPath) use ($dumpBinary, $host, $port, $username, $database, $temporarySqlPath): void {
                $command = sprintf(
                    '%s --defaults-extra-file=%s --host=%s --port=%s --user=%s --single-transaction --no-tablespaces %s > %s',
                    escapeshellarg($dumpBinary),
                    escapeshellarg($credentialsPath),
                    escapeshellarg($host),
                    escapeshellarg((string) $port),
                    escapeshellarg($username),
                    escapeshellarg($database),
                    escapeshellarg($temporarySqlPath)
                );

                $this->runMysqlCommand($command, 'mysqldump');
            });

            $contents = file_get_contents($temporarySqlPath);
            if ($contents === false || file_put_contents($targetPath, gzencode($contents, 9)) === false) {
                throw new \RuntimeException('Could not compress the MySQL backup.');
            }
        } finally {
            @unlink($temporarySqlPath);
        }
    }

    /**
     * Takes a snapshot of the current database first, then restores; on any
     * failure the snapshot is put back so a failed restore never leaves the
     * database in a half-written state. Mirrors restoreMysqlWithSafetyBackup.
     */
    private function restoreSqliteWithSafetyBackup(string $backupPath): void
    {
        $safetyFilename = self::FILENAME_PATTERN.'pre_restore_'.now()->format('Y-m-d_His').'.sql.gz';
        $safetyPath = 'backups/'.$safetyFilename;

        Storage::disk($this->disk)->makeDirectory('backups');
        $this->createSqliteBackup($safetyPath);
        $safetyAbsolutePath = Storage::disk($this->disk)->path($safetyPath);

        try {
            $this->restoreSqlite($backupPath);
            Storage::disk($this->disk)->delete($safetyPath);
        } catch (\Throwable $e) {
            $this->restoreSqlite($safetyAbsolutePath);
            Storage::disk($this->disk)->delete($safetyPath);

            throw $e;
        }
    }

    private function restoreSqlite(string $backupPath): void
    {
        $gzContent = file_get_contents($backupPath);
        if ($gzContent === false) {
            throw new \RuntimeException('Could not read the backup file.');
        }

        $content = @gzdecode($gzContent);
        if ($content === false) {
            throw new \RuntimeException('Failed to decompress backup file.');
        }

        if (str_starts_with($content, 'SQLite format 3')) {
            $this->restoreSqliteBinary($content);

            return;
        }

        if (str_contains($content, self::DUMP_DELIMITER)
            || stripos($content, 'CREATE TABLE') === 0
            || stripos($content, 'INSERT INTO') === 0) {
            $this->restoreSqliteFromSql($content);

            return;
        }

        throw new \RuntimeException('Unrecognised backup format.');
    }

    /**
     * Swaps a binary SQLite image in atomically: stage it next to the live
     * file, drop the connection plus the old WAL/SHM sidecars (so SQLite can't
     * replay them over the new file), then rename() into place.
     */
    private function restoreSqliteBinary(string $image): void
    {
        $dbPath = config('database.connections.sqlite.database');
        $staged = $dbPath.'.restore-'.bin2hex(random_bytes(6));

        if (file_put_contents($staged, $image) === false) {
            throw new \RuntimeException('Could not stage the restored database.');
        }

        DB::disconnect();

        foreach (['-wal', '-shm'] as $sidecar) {
            @unlink($dbPath.$sidecar);
        }

        if (! @rename($staged, $dbPath)) {
            @unlink($staged);

            throw new \RuntimeException('Could not swap in the restored database.');
        }
    }

    private function restoreSqliteFromSql(string $sql): void
    {
        $pdo = DB::connection()->getPdo();

        DB::transaction(function () use ($pdo, $sql) {
            // Enforcement is deferred to commit — by which point every table
            // has been recreated and refilled — so the drop/create/insert
            // order doesn't have to be a valid FK topological sort. Works
            // inside a transaction, unlike `PRAGMA foreign_keys`.
            $pdo->exec('PRAGMA defer_foreign_keys = ON');

            $statements = array_filter(
                array_map('trim', explode(self::DUMP_DELIMITER, $sql)),
                fn (string $s) => $s !== ''
            );

            foreach ($statements as $statement) {
                $keyword = strtoupper(ltrim($statement));

                if (str_starts_with($keyword, 'CREATE TABLE')) {
                    $pdo->exec('DROP TABLE IF EXISTS "'.$this->extractObjectName($statement).'"');
                } elseif (str_starts_with($keyword, 'CREATE INDEX') || str_starts_with($keyword, 'CREATE UNIQUE INDEX')) {
                    $pdo->exec('DROP INDEX IF EXISTS "'.$this->extractObjectName($statement).'"');
                } elseif (str_starts_with($keyword, 'CREATE TRIGGER')) {
                    $pdo->exec('DROP TRIGGER IF EXISTS "'.$this->extractObjectName($statement).'"');
                } elseif (str_starts_with($keyword, 'CREATE VIEW')) {
                    $pdo->exec('DROP VIEW IF EXISTS "'.$this->extractObjectName($statement).'"');
                }

                $pdo->exec($statement);
            }
        });
    }

    private function restoreMysqlWithSafetyBackup(string $backupPath): void
    {
        $safetyFilename = self::FILENAME_PATTERN.'pre_restore_'.now()->format('Y-m-d_His').'.sql.gz';
        $safetyPath = 'backups/'.$safetyFilename;

        Storage::disk($this->disk)->makeDirectory('backups');
        $this->createMysqlBackup($safetyPath);

        try {
            $this->restoreMysql($backupPath);
            Storage::disk($this->disk)->delete($safetyPath);
        } catch (\Throwable $e) {
            try {
                $this->restoreMysql(Storage::disk($this->disk)->path($safetyPath));
            } catch (\Throwable $rollbackException) {
                Log::critical('MySQL restore and automatic rollback both failed. Emergency backup preserved.', [
                    'safety_backup_path' => $safetyPath,
                    'restore_error' => $this->sanitizeDiagnosticText($e->getMessage()),
                    'rollback_error' => $this->sanitizeDiagnosticText($rollbackException->getMessage()),
                ]);

                throw new \RuntimeException(
                    'Database restore failed and automatic rollback failed. The emergency backup was preserved at '.$safetyPath.'.',
                    0,
                    $e,
                );
            }

            Log::warning('MySQL restore failed; automatic rollback succeeded.', [
                'safety_backup_path' => $safetyPath,
                'restore_error' => $this->sanitizeDiagnosticText($e->getMessage()),
            ]);
            Storage::disk($this->disk)->delete($safetyPath);

            throw $e;
        }
    }

    private function extractObjectName(string $createSql): string
    {
        if (preg_match('/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)\s+(?:IF NOT EXISTS\s+)?"?([A-Za-z0-9_]+)"?/i', $createSql, $matches)) {
            return $matches[1];
        }

        return '';
    }

    private function restoreMysql(string $backupPath): void
    {
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');
        $database = config('database.connections.mysql.database');
        $username = config('database.connections.mysql.username');
        $password = (string) config('database.connections.mysql.password');
        $temporarySqlPath = tempnam(sys_get_temp_dir(), 'alumnilink-restore-');

        if ($temporarySqlPath === false) {
            throw new \RuntimeException('Could not create a temporary MySQL restore file.');
        }

        $compressed = file_get_contents($backupPath);
        $contents = $compressed === false ? false : @gzdecode($compressed);

        if ($contents === false || file_put_contents($temporarySqlPath, $contents) === false) {
            @unlink($temporarySqlPath);
            throw new \RuntimeException('Could not decompress the MySQL backup.');
        }

        try {
            $mysqlBinary = ($this->binaryResolver)('client');

            $this->withMysqlCredentials($password, function (string $credentialsPath) use ($mysqlBinary, $host, $port, $username, $database, $temporarySqlPath): void {
                $command = sprintf(
                    '%s --defaults-extra-file=%s --host=%s --port=%s --user=%s %s < %s',
                    escapeshellarg($mysqlBinary),
                    escapeshellarg($credentialsPath),
                    escapeshellarg($host),
                    escapeshellarg((string) $port),
                    escapeshellarg($username),
                    escapeshellarg($database),
                    escapeshellarg($temporarySqlPath)
                );

                $this->runMysqlCommand($command, 'mysql restore');
            });
        } finally {
            @unlink($temporarySqlPath);
        }
    }

    private function runMysqlCommand(string $command, string $operation): void
    {
        $output = [];
        $resultCode = 0;
        ($this->commandRunner)($command, $output, $resultCode);

        if ($resultCode !== 0) {
            $details = $this->sanitizeDiagnosticText(implode(PHP_EOL, $output));
            Log::error('MySQL command failed.', [
                'operation' => $operation,
                'exit_code' => $resultCode,
                'diagnostics' => $details !== '' ? $details : 'No diagnostic output was returned.',
            ]);

            throw new \RuntimeException($operation.' failed. See the Laravel log for details.');
        }
    }

    private function sanitizeDiagnosticText(string $details): string
    {
        $details = preg_replace('/(?i)(password\s*[=:]\s*)("[^"]*"|\S+)/', '$1[redacted]', $details) ?? $details;
        $details = preg_replace('/(?i)(--password(?:=|\s+))\S+/', '$1[redacted]', $details) ?? $details;

        return mb_substr(trim($details), 0, 4000);
    }

    private function resolveMysqlBinary(string $tool): string
    {
        $configKey = $tool === 'dump' ? 'backup.mysql_dump_path' : 'backup.mysql_path';
        $binaryName = $tool === 'dump' ? 'mysqldump' : 'mysql';
        $configuredPath = trim((string) config($configKey, ''));

        if ($configuredPath !== '') {
            if (! is_file($configuredPath)) {
                throw new \RuntimeException("Configured {$binaryName} path was not found: {$configuredPath}");
            }

            return $configuredPath;
        }

        $suffix = PHP_OS_FAMILY === 'Windows' ? '.exe' : '';
        $candidates = [];
        $pathValue = (string) (getenv('PATH') ?: getenv('Path') ?: '');

        foreach (explode(PATH_SEPARATOR, $pathValue) as $directory) {
            if ($directory !== '') {
                $candidates[] = rtrim($directory, '\\/').DIRECTORY_SEPARATOR.$binaryName.$suffix;
            }
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $roots = ['C:\\wamp64', 'C:\\wamp'];
            $phpDirectory = dirname(PHP_BINARY);

            for ($i = 0; $i < 5; $i++) {
                $roots[] = $phpDirectory;
                $phpDirectory = dirname($phpDirectory);
            }

            foreach (array_unique($roots) as $root) {
                foreach (['mysql', 'mariadb'] as $engine) {
                    foreach (glob($root.DIRECTORY_SEPARATOR.'bin'.DIRECTORY_SEPARATOR.$engine.DIRECTORY_SEPARATOR.'*'.DIRECTORY_SEPARATOR.'bin'.DIRECTORY_SEPARATOR.$binaryName.$suffix) ?: [] as $candidate) {
                        $candidates[] = $candidate;
                    }
                }
            }
        }

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        throw new \RuntimeException("Could not locate {$binaryName}. Set ".($tool === 'dump' ? 'MYSQLDUMP_PATH' : 'MYSQL_PATH').' in backend/.env or add the WAMP MySQL bin folder to the PHP process PATH.');
    }

    private function withMysqlCredentials(string $password, callable $operation): mixed
    {
        $credentialsPath = tempnam(sys_get_temp_dir(), 'alumnilink-mysql-');

        if ($credentialsPath === false) {
            throw new \RuntimeException('Could not create the temporary MySQL credentials file.');
        }

        try {
            // Windows treats chmod as a near-no-op; user-scoped temp storage is acceptable here.
            if (! @chmod($credentialsPath, 0600)) {
                throw new \RuntimeException('Could not secure the temporary MySQL credentials file.');
            }

            $escapedPassword = addcslashes($password, "\\\"\r\n");
            if (file_put_contents($credentialsPath, "[client]\npassword=\"{$escapedPassword}\"\n") === false) {
                throw new \RuntimeException('Could not write the temporary MySQL credentials file.');
            }

            return $operation($credentialsPath);
        } finally {
            @unlink($credentialsPath);
        }
    }

    private function enforceRetention(): void
    {
        $count = Backup::count();

        if ($count <= self::MAX_BACKUPS) {
            return;
        }

        $oldest = Backup::orderBy('created_at', 'asc')
            ->limit($count - self::MAX_BACKUPS)
            ->get();

        foreach ($oldest as $backup) {
            $this->delete($backup);
        }
    }
}

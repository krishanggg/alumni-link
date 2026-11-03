<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Alumni;
use App\Models\Backup;
use App\Models\School;
use App\Models\User;
use App\Support\ExportCellSanitizer;
use App\Support\Pagination;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SystemController extends Controller
{
    public const ACTIVITY_LOG_EXPORT_MAX_ROWS = 25_000;

    public function info(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $appName = config('app.name', 'AlumniLink');
        $appVersion = config('app.version', '1.0.0');
        $appEnv = ucfirst((string) config('app.env', 'production'));

        $phpVersion = PHP_VERSION;
        $laravelVersion = app()->version();

        $dbConnection = config('database.default');
        $dbConfig = config("database.connections.{$dbConnection}");
        $dbName = $dbConfig['database'] ?? 'N/A';

        $dbSolutions = [
            'sqlite' => 'SQLite',
            'mysql' => 'MySQL',
            'mariadb' => 'MariaDB',
            'pgsql' => 'PostgreSQL',
            'sqlsrv' => 'SQL Server',
        ];
        $dbDisplayName = $dbSolutions[$dbConnection] ?? ucfirst((string) $dbConnection);

        $webServerRaw = $_SERVER['SERVER_SOFTWARE'] ?? 'N/A';
        $webServer = trim((string) preg_replace('/\s*\(.*?\)\s*/', '', $webServerRaw));

        try {
            $result = DB::select('SELECT VERSION() AS v');
            $dbVersion = $result[0]->v ?? 'N/A';
        } catch (Exception $e) {
            $dbVersion = 'N/A';
        }

        $dbSize = 'N/A';
        try {
            if ($dbConnection === 'sqlite') {
                $dbPath = $dbConfig['database'] ?? null;
                if ($dbPath && file_exists($dbPath)) {
                    $dbSize = $this->formatBytes((int) filesize($dbPath));
                }
            } else {
                $sizeResult = DB::select(
                    'SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema = ?',
                    [$dbName]
                );
                $dbSize = ($sizeResult[0]->size_mb ?? 0).' MB';
            }
        } catch (Exception $e) {
        }

        $tableCount = 0;
        try {
            if ($dbConnection === 'sqlite') {
                $tables = DB::select('SELECT name FROM sqlite_master WHERE type = "table" AND name NOT LIKE "sqlite_%"');
            } else {
                $tables = DB::select(
                    'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = ?',
                    [$dbName]
                );
            }
            $tableCount = count($tables);
        } catch (Exception $e) {
        }

        $cacheDriver = ucfirst((string) config('cache.default'));
        $sessionDriver = ucfirst((string) config('session.driver'));

        $diskPath = base_path();
        $diskFree = (int) (disk_free_space($diskPath) ?: 0);
        $diskTotal = (int) (disk_total_space($diskPath) ?: 0);

        $lastBackup = Backup::orderBy('created_at', 'desc')->first();

        return response()->json([
            'application' => [
                'name' => $appName,
                'version' => $appVersion,
                'environment' => $appEnv,
                'frontend' => 'React',
            ],
            'server' => [
                'php_version' => $phpVersion,
                'laravel_version' => $laravelVersion,
                'os' => PHP_OS_FAMILY,
                'web_server' => $webServer,
                'time' => now()->toIso8601String(),
                'status' => 'Online',
                'uptime' => $this->serverUptime(),
            ],
            'database' => [
                'name' => $dbDisplayName,
                'version' => $dbVersion,
                'size' => $dbSize,
                'table_count' => $tableCount,
            ],
            'storage' => [
                'total' => $this->formatBytes($diskTotal),
                'free' => $this->formatBytes($diskFree),
                'used' => $this->formatBytes($diskTotal - $diskFree),
            ],
            'cache' => [
                'driver' => $cacheDriver,
                'session_driver' => $sessionDriver,
            ],
            'counts' => [
                'schools' => School::count(),
                'active_schools' => School::where('is_active', true)->count(),
                'alumni' => Alumni::confirmed()->whereNull('deleted_at')->count(),
                'users' => User::count(),
            ],
            'last_backup' => $lastBackup?->created_at?->toIso8601String() ?? 'Never',
        ]);
    }

    public function activityLogs(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('username', 'like', "%{$search}%")
                            ->orWhereHas('alumni', function ($alumniQuery) use ($search) {
                                $alumniQuery->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                    });
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        $logs = $query->paginate(Pagination::clampPerPage((int) $request->input('per_page', 20), 20));

        return response()->json($this->paginatedResource($logs, ActivityLogResource::class));
    }

    public function activityLogActions(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $actions = ActivityLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return response()->json(['actions' => $actions]);
    }

    public function activityLogUsers(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $userIds = ActivityLog::query()
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        $users = User::whereIn('id', $userIds)
            ->with('alumni')
            ->orderBy('username')
            ->get(['id', 'username', 'alumni_id'])
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name])
            ->values();

        return response()->json(['users' => $users]);
    }

    public function exportActivityLogs(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', User::class);

        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('username', 'like', "%{$search}%")
                            ->orWhereHas('alumni', function ($alumniQuery) use ($search) {
                                $alumniQuery->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                    });
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        $truncated = (clone $query)->count() > self::ACTIVITY_LOG_EXPORT_MAX_ROWS;
        $logs = $query->limit(self::ACTIVITY_LOG_EXPORT_MAX_ROWS)->get();

        return response()->streamDownload(function () use ($logs, $truncated) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date & Time', 'User', 'Action', 'Description', 'IP Address']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->created_at?->toIso8601String() ?? '',
                    ExportCellSanitizer::sanitize($log->user?->name ?? 'System'),
                    ExportCellSanitizer::sanitize($log->action),
                    ExportCellSanitizer::sanitize($log->description ?? ''),
                    ExportCellSanitizer::sanitize($log->ip_address ?? ''),
                ]);
            }

            if ($truncated) {
                fputcsv($handle, ['Output truncated at '.self::ACTIVITY_LOG_EXPORT_MAX_ROWS.' rows.']);
            }

            fclose($handle);
        }, 'activity-logs-'.now()->format('Y-m-d').'.csv');
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, $precision).' '.$units[$pow];
    }

    private function serverUptime(): string
    {
        $rawUptime = @file_get_contents('/proc/uptime');
        if ($rawUptime === false) {
            return 'Not available';
        }

        $seconds = (int) floor((float) explode(' ', trim($rawUptime))[0]);
        $days = intdiv($seconds, 86400);
        $hours = intdiv($seconds % 86400, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        return "{$days}d {$hours}h {$minutes}m";
    }
}

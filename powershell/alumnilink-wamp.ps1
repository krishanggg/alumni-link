[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Action,

    [string]$Root,

    [switch]$BackupOnly,

    [switch]$StorageOnly,

    [switch]$CheckDatabase,

    [string]$InputPath,

    [string]$Stage,

    [int]$ExitCode,

    [string]$LogPath,

    [string]$HostsPath,

    [string]$ApachePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ValidationExitCode = 10
$InternalExitCode = 11

if ([string]::IsNullOrWhiteSpace($Root)) {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $Root = Split-Path -Parent $scriptDirectory
}

$Root = [IO.Path]::GetFullPath($Root)
$ActionLabel = switch ($Action) {
    'Doctor' { 'doctor' }
    'RecordCommand' { 'setup logging' }
    'EnsureHostMapping' { 'local hostname configuration' }
    'AddHostMapping' { 'local hostname configuration' }
    'EnsureApacheConfig' { 'Apache virtual-host configuration' }
    'InstallApacheConfig' { 'Apache virtual-host configuration' }
    default { 'setup validation' }
}

function Write-ValidationError {
    param([string]$Message)

    Write-Output $Message
    exit $ValidationExitCode
}

function Write-InternalFailure {
    param([System.Management.Automation.ErrorRecord]$ErrorRecord)

    $logDirectory = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'AlumniLink'
    $logPath = Join-Path $logDirectory 'wamp-helper.log'

    try {
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $safeMessage = [string]$ErrorRecord.Exception.Message
        $safeMessage = $safeMessage -replace '(?i)(DB_[A-Z0-9_]+|SUPER_ADMIN_[A-Z0-9_]+|APP_KEY|password|secret|token|api[_-]?key|credential)\s*[:=]\s*[^\s,;]+', '$1=[redacted]'
        $entry = '[{0}] action={1}; type={2}; message={3}' -f (Get-Date -Format 's'), $ActionLabel, $ErrorRecord.Exception.GetType().FullName, $safeMessage
        Add-Content -LiteralPath $logPath -Value $entry -Encoding UTF8
    } catch {
        $logPath = $null
    }

    Write-Output ("[ERROR] AlumniLink {0} encountered an internal script error." -f $ActionLabel)
    if ($null -ne $logPath) {
        Write-Output ("[ERROR] Sanitized diagnostics were written to {0}." -f $logPath)
    }
    exit $InternalExitCode
}

function Write-CommandLog {
    param(
        [string]$CapturedOutputPath,
        [string]$CommandStage,
        [int]$CommandExitCode,
        [string]$ExplicitLogPath
    )

    $targetLogPath = $ExplicitLogPath
    if ([string]::IsNullOrWhiteSpace($targetLogPath)) {
        $logDirectory = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'AlumniLink'
        $targetLogPath = Join-Path $logDirectory 'setup.log'
    }

    New-Item -ItemType Directory -Path (Split-Path -Parent $targetLogPath) -Force | Out-Null
    $rawOutput = if (Test-Path -LiteralPath $CapturedOutputPath -PathType Leaf) {
        [IO.File]::ReadAllText($CapturedOutputPath)
    } else {
        '[No captured command output was available.]'
    }

    # Command output is useful for troubleshooting, but it must not turn the
    # setup log into a copy of .env or a place where credentials can leak.
    $safeOutput = $rawOutput -replace '(?im)^[^\r\n]*(DB_[A-Z0-9_]+|SUPER_ADMIN_[A-Z0-9_]+|APP_KEY|RESEND_API_KEY|password|secret|token|api[_-]?key|credential)[^\r\n]*$', '[redacted sensitive diagnostic line]'
    $safeOutput = $safeOutput -replace '(?i)([A-Za-z][A-Za-z0-9+.-]*://[^/\s:@]+:)[^@\s]+@', '$1[redacted]@'
    $safeOutput = $safeOutput -replace '(?i)(password|secret|token|api[_-]?key|credential)\s*[:=]\s*[^\s,;]+', '$1=[redacted]'
    if ([string]::IsNullOrWhiteSpace($safeOutput)) {
        $safeOutput = '[No command output was captured.]'
    }
    if ($safeOutput.Length -gt 12000) {
        $safeOutput = $safeOutput.Substring(0, 12000) + "`r`n[command output truncated]"
    }

    $entry = @(
        ('[{0}] stage={1}; status={2}; exit_code={3}' -f (Get-Date -Format 's'), $CommandStage, $(if ($CommandExitCode -eq 0) { 'success' } else { 'failed' }), $CommandExitCode)
        $safeOutput.TrimEnd()
        ''
    ) -join "`r`n"
    Add-Content -LiteralPath $targetLogPath -Value $entry -Encoding UTF8
}

function Get-DotEnvValue {
    param(
        [string]$RawValue,
        [int]$LineNumber,
        [string]$Name
    )

    $value = $RawValue.Trim()
    if ($value.Length -eq 0) {
        return ''
    }

    $quote = $value[0]
    if ($quote -eq "'" -or $quote -eq '"') {
        $builder = New-Object System.Text.StringBuilder
        $index = 1
        $closed = $false
        while ($index -lt $value.Length) {
            $character = $value[$index]
            if ($character -eq $quote) {
                $closed = $true
                $index++
                break
            }
            if ($quote -eq '"' -and $character -eq '\') {
                $index++
                if ($index -ge $value.Length) {
                    throw [FormatException]::new(('Unterminated quoted value on line {0}.' -f $LineNumber))
                }
                $escaped = $value[$index]
                $replacement = switch ($escaped) {
                    '"' { '"' }
                    '\' { '\' }
                    '$' { '$' }
                    'f' { [char]12 }
                    'n' { [char]10 }
                    'r' { [char]13 }
                    't' { [char]9 }
                    'v' { [char]11 }
                    default { throw [FormatException]::new(('Unexpected escape sequence on line {0}.' -f $LineNumber)) }
                }
                [void]$builder.Append($replacement)
                $index++
                continue
            }
            [void]$builder.Append($character)
            $index++
        }

        if (-not $closed) {
            throw [FormatException]::new(('Unterminated quoted value on line {0}.' -f $LineNumber))
        }
        $suffix = $value.Substring($index).Trim()
        if ($suffix.Length -gt 0 -and -not $suffix.StartsWith('#')) {
            throw [FormatException]::new(('Unexpected characters after a quoted value on line {0}.' -f $LineNumber))
        }
        return $builder.ToString()
    }

    $builder = New-Object System.Text.StringBuilder
    $state = 'unquoted'
    for ($index = 0; $index -lt $value.Length; $index++) {
        $character = $value[$index]
        if ($state -eq 'comment') {
            break
        }
        if ($character -eq '#') {
            $state = 'comment'
            continue
        }
        if ([char]::IsWhiteSpace($character)) {
            $state = 'whitespace'
            continue
        }
        if ($state -eq 'whitespace') {
            throw [FormatException]::new(('[ERROR] Invalid value for {0}: values containing spaces must be quoted.' -f $Name) + "`r`n" + ('Example: {0}="System Admin"' -f $Name))
        }
        [void]$builder.Append($character)
    }

    return $builder.ToString().Trim()
}

function Read-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        Write-ValidationError '[ERROR] backend\.env is missing. Run setup.bat first.'
    }

    $values = @{}
    $lineNumber = 0
    foreach ($line in Get-Content -LiteralPath $Path) {
        $lineNumber++
        $trimmedLine = $line.Trim()
        if ($trimmedLine.Length -eq 0 -or $trimmedLine.StartsWith('#')) {
            continue
        }

        if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            throw [FormatException]::new(('Malformed environment entry on line {0}.' -f $lineNumber))
        }

        $name = $matches[1]
        $values[$name] = Get-DotEnvValue -RawValue $matches[2] -LineNumber $lineNumber -Name $name
    }

    return $values
}

function Get-EnvironmentValue {
    param(
        [hashtable]$Values,
        [string]$Name
    )

    if ($Values.ContainsKey($Name)) {
        return [string]$Values[$Name]
    }

    return ''
}

function Test-Environment {
    param([hashtable]$Values)

    $required = @(
        'APP_ENV', 'APP_DEBUG', 'APP_URL', 'DB_CONNECTION', 'DB_HOST',
        'DB_DATABASE', 'DB_USERNAME', 'SUPER_ADMIN_NAME', 'SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_USERNAME'
    )

    foreach ($name in $required) {
        if ([string]::IsNullOrWhiteSpace((Get-EnvironmentValue -Values $Values -Name $name))) {
            Write-ValidationError ("[ERROR] backend\.env is missing {0}. Add it and run setup.bat again." -f $name)
        }
    }

    $port = Get-EnvironmentValue -Values $Values -Name 'DB_PORT'
    $portIsValid = $port -match '^[0-9]{1,5}$'
    if ($portIsValid) {
        $portNumber = [int]$port
        $portIsValid = $portNumber -ge 1 -and $portNumber -le 65535
    }
    if (-not $portIsValid) {
        Write-ValidationError '[ERROR] DB_PORT must be a valid numeric TCP port for the local WAMP MySQL service.'
    }

    if ((Get-EnvironmentValue -Values $Values -Name 'APP_ENV') -ne 'production' -or
        (Get-EnvironmentValue -Values $Values -Name 'APP_DEBUG') -ne 'false' -or
        (Get-EnvironmentValue -Values $Values -Name 'DB_CONNECTION') -ne 'mysql' -or
        (Get-EnvironmentValue -Values $Values -Name 'DB_HOST') -ne '127.0.0.1') {
        Write-ValidationError '[ERROR] The WAMP profile requires APP_ENV=production, APP_DEBUG=false, DB_CONNECTION=mysql, and DB_HOST=127.0.0.1. Correct backend\.env and try again.'
    }

    $password = Get-EnvironmentValue -Values $Values -Name 'SUPER_ADMIN_PASSWORD'
    if ([string]::IsNullOrWhiteSpace($password)) {
        Write-ValidationError '[ERROR] SUPER_ADMIN_PASSWORD must be set and at least 12 characters; do not use the default password.'
    }
    if ($password.Length -lt 12 -or $password -eq 'Admin123!') {
        Write-ValidationError '[ERROR] SUPER_ADMIN_PASSWORD must be at least 12 characters and cannot use the default password.'
    }
}

function Find-MySqlBinary {
    param(
        [hashtable]$Values,
        [string]$Name,
        [string]$EnvironmentName
    )

    $configuredPath = Get-EnvironmentValue -Values $Values -Name $EnvironmentName
    if ($configuredPath -and (Test-Path -LiteralPath $configuredPath -PathType Leaf)) {
        return $configuredPath
    }

    if ($configuredPath) {
        return $false
    }

    foreach ($wampRoot in @('C:\wamp64', 'C:\wamp')) {
        $binRoot = Join-Path $wampRoot 'bin'
        if (-not (Test-Path -LiteralPath $binRoot -PathType Container)) {
            continue
        }
        $match = Get-ChildItem -LiteralPath $binRoot -Filter ($Name + '.exe') -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\bin\\mysql\\[^\\]+\\bin\\' } |
            Select-Object -First 1
        if ($null -ne $match) {
            return $match.FullName
        }
    }

    $pathValue = [string]([Environment]::GetEnvironmentVariable('Path'))
    foreach ($directory in $pathValue.Split(';')) {
        if (-not $directory) {
            continue
        }
        foreach ($extension in @('.exe', '.cmd')) {
            $candidate = Join-Path $directory ($Name + $extension)
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                return $candidate
            }
        }
    }

    return $false
}

function Test-MySqlTools {
    param([hashtable]$Values)

    foreach ($tool in @(
        @{ Name = 'mysqldump'; EnvironmentName = 'MYSQLDUMP_PATH' },
        @{ Name = 'mysql'; EnvironmentName = 'MYSQL_PATH' }
    )) {
        if ([string]::IsNullOrWhiteSpace((Find-MySqlBinary -Values $Values -Name $tool.Name -EnvironmentName $tool.EnvironmentName))) {
            Write-ValidationError ("[ERROR] {0}.exe was not found. Set {1} in backend\.env or expose the WAMP MySQL bin folder to PATH, then retry." -f $tool.Name, $tool.EnvironmentName)
        }
    }
}

function Invoke-MySqlQuery {
    param(
        [string]$Path,
        [string[]]$Arguments
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $queryOutput = @(& $Path @Arguments 2>&1)
        return [pscustomobject]@{
            Output = $queryOutput
            ExitCode = $LASTEXITCODE
        }
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Get-MySqlScalarOutput {
    param([object[]]$Output)

    $lines = @($Output | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($lines.Count -eq 0) {
        return ''
    }

    return ([string]$lines[-1]).Trim()
}

function Get-MySqlNonEmptyOutput {
    param([object[]]$Output)

    return @($Output | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() })
}

function Test-MySqlStorageEngine {
    param(
        [string]$Path,
        [string]$OptionPath
    )

    $defaultEngineResult = Invoke-MySqlQuery -Path $Path -Arguments @(
        "--defaults-extra-file=$OptionPath", '--batch', '--skip-column-names', '--execute=SELECT @@default_storage_engine'
    )
    if ($defaultEngineResult.ExitCode -ne 0) {
        Write-ValidationError '[ERROR] Could not inspect the MySQL storage engine. Check the configured MySQL account and retry.'
    }

    $defaultEngine = Get-MySqlScalarOutput -Output $defaultEngineResult.Output
    if ([string]::IsNullOrWhiteSpace($defaultEngine)) {
        Write-ValidationError '[ERROR] MySQL did not report a default storage engine. Check the WAMP MySQL service and retry.'
    }

    $innodbResult = Invoke-MySqlQuery -Path $Path -Arguments @(
        "--defaults-extra-file=$OptionPath", '--batch', '--skip-column-names', "--execute=SELECT SUPPORT FROM INFORMATION_SCHEMA.ENGINES WHERE ENGINE = 'InnoDB'"
    )
    if ($innodbResult.ExitCode -ne 0) {
        Write-ValidationError '[ERROR] Could not verify MySQL InnoDB support. Check the WAMP MySQL service and retry.'
    }

    $innodbSupport = Get-MySqlScalarOutput -Output $innodbResult.Output
    if ($innodbSupport -notmatch '(?i)^(DEFAULT|YES)$') {
        Write-ValidationError '[ERROR] MySQL InnoDB storage engine is unavailable. Enable InnoDB in the WAMP MySQL service, then retry setup.'
    }

    Write-Output ('[INFO] MySQL default storage engine is {0}; AlumniLink tables will use InnoDB.' -f $defaultEngine)
}

function Normalize-FreshMigrationsTable {
    param(
        [string]$Path,
        [string]$OptionPath,
        [string]$Database,
        [string]$SafeDatabaseLiteral
    )

    $tableCountQuery = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$SafeDatabaseLiteral' AND TABLE_TYPE = 'BASE TABLE';"
    $tableCountResult = Invoke-MySqlQuery -Path $Path -Arguments @(
        "--defaults-extra-file=$OptionPath", '--batch', '--skip-column-names', "--execute=$tableCountQuery"
    )
    if ($tableCountResult.ExitCode -ne 0) {
        Write-ValidationError ('[ERROR] Could not inspect the tables in MySQL database "{0}". Check database permissions and retry.' -f $Database)
    }

    $tableCount = @(Get-MySqlNonEmptyOutput -Output $tableCountResult.Output).Count

    $migrationEngineQuery = "SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$SafeDatabaseLiteral' AND TABLE_NAME = 'migrations';"
    $migrationEngineResult = Invoke-MySqlQuery -Path $Path -Arguments @(
        "--defaults-extra-file=$OptionPath", '--batch', '--skip-column-names', "--execute=$migrationEngineQuery"
    )
    if ($migrationEngineResult.ExitCode -ne 0) {
        Write-ValidationError ('[ERROR] Could not inspect the migrations table in database "{0}". Check database permissions and retry.' -f $Database)
    }

    $migrationEngine = Get-MySqlScalarOutput -Output $migrationEngineResult.Output
    if ([string]::IsNullOrWhiteSpace($migrationEngine) -or $migrationEngine -ieq 'InnoDB') {
        return
    }

    $migrationRowsQuery = 'SELECT migration FROM `migrations`;'
    $migrationRowsResult = Invoke-MySqlQuery -Path $Path -Arguments @(
        "--defaults-extra-file=$OptionPath", '--batch', '--skip-column-names', "--execute=$migrationRowsQuery"
    )
    if ($migrationRowsResult.ExitCode -ne 0) {
        Write-ValidationError ('[ERROR] Could not inspect the migrations repository in database "{0}". Check database permissions and retry.' -f $Database)
    }

    $migrationRows = @(Get-MySqlNonEmptyOutput -Output $migrationRowsResult.Output).Count

    if ($tableCount -eq 1 -and $migrationRows -eq 0) {
        Write-Output ('[INFO] The empty migrations table uses {0}; converting it to InnoDB before setup continues.' -f $migrationEngine)
        $convertResult = Invoke-MySqlQuery -Path $Path -Arguments @(
            "--defaults-extra-file=$OptionPath", '--batch', '--skip-column-names', '--execute=ALTER TABLE `migrations` ENGINE=InnoDB;'
        )
        if ($convertResult.ExitCode -ne 0) {
            Write-ValidationError '[ERROR] The empty migrations table could not be converted to InnoDB. Confirm the MySQL account has ALTER permission, then retry setup.'
        }
        Write-Output '[OK] The empty migrations table now uses InnoDB.'
        return
    }

    Write-Output ('[INFO] Existing migrations table uses {0}; it was preserved because database "{1}" is not an empty fresh database. New AlumniLink tables will use InnoDB.' -f $migrationEngine, $Database)
}

function Test-MySqlDatabaseConnection {
    param(
        [hashtable]$Values,
        [switch]$CreateIfMissing
    )

    $mysqlPath = Find-MySqlBinary -Values $Values -Name 'mysql' -EnvironmentName 'MYSQL_PATH'
    if ([string]::IsNullOrWhiteSpace($mysqlPath)) {
        Write-ValidationError '[ERROR] mysql.exe was not found. Set MYSQL_PATH in backend\.env or expose the WAMP MySQL bin folder to PATH, then retry.'
    }

    $optionPath = Join-Path ([IO.Path]::GetTempPath()) ('alumnilink-mysql-{0}.cnf' -f [guid]::NewGuid().ToString('N'))
    $hostName = Get-EnvironmentValue -Values $Values -Name 'DB_HOST'
    $port = Get-EnvironmentValue -Values $Values -Name 'DB_PORT'
    $database = Get-EnvironmentValue -Values $Values -Name 'DB_DATABASE'
    $username = Get-EnvironmentValue -Values $Values -Name 'DB_USERNAME'
    $password = Get-EnvironmentValue -Values $Values -Name 'DB_PASSWORD'

    $sqlPath = Join-Path $Root 'database\wamp-create-database.sql'
    if (-not (Test-Path -LiteralPath $sqlPath -PathType Leaf)) {
        throw [IO.FileNotFoundException]::new('The shipped WAMP database definition is missing.')
    }
    $sqlDefinition = [IO.File]::ReadAllText($sqlPath)
    $definitionMatch = [regex]::Match($sqlDefinition, '(?is)CHARACTER\s+SET\s+([A-Za-z0-9_]+)\s+COLLATE\s+([A-Za-z0-9_]+)')
    if (-not $definitionMatch.Success) {
        throw [FormatException]::new('The shipped WAMP database definition does not specify a charset and collation.')
    }
    $charset = $definitionMatch.Groups[1].Value
    $collation = $definitionMatch.Groups[2].Value
    $safeDatabase = $database.Replace('`', '``')
    $safeDatabaseLiteral = $database.Replace("'", "''")

    try {
        $baseOptionFile = @(
            '[client]'
            ('host={0}' -f $hostName)
            ('port={0}' -f $port)
            ('user={0}' -f $username)
            ('password={0}' -f $password)
        ) -join "`r`n"
        [IO.File]::WriteAllText($optionPath, $baseOptionFile, (New-Object System.Text.UTF8Encoding($false)))

        $probeResult = Invoke-MySqlQuery -Path $mysqlPath -Arguments @("--defaults-extra-file=$optionPath", '--batch', '--skip-column-names', '--execute=SELECT 1')
        $probeOutput = $probeResult.Output
        $probeExitCode = $probeResult.ExitCode
        if ($probeExitCode -ne 0) {
            $diagnostic = ($probeOutput -join ' ')
            if ($diagnostic -match '(?i)access denied') {
                Write-ValidationError ('[ERROR] Could not authenticate to MySQL at {0}:{1} as user "{2}". In Wampserver Tools, confirm the default DBMS is MySQL and its port matches DB_PORT. Check DB_USERNAME and DB_PASSWORD in backend\.env; leave DB_PASSWORD blank only if this MySQL account has no password.' -f $hostName, $port, $username)
            }
            if ($diagnostic -match '(?i)can.t connect|connection refused|lost connection|unable to connect|no route') {
                Write-ValidationError ('[ERROR] MySQL could not be reached at {0}:{1}. In Wampserver Tools, confirm the default DBMS is MySQL, its port matches DB_PORT, and the MySQL service is running.' -f $hostName, $port)
            }
            if ($diagnostic -match '(?i)authentication plugin|auth plugin|caching_sha2|sha256_password') {
                Write-ValidationError ('[ERROR] The MySQL client could not authenticate to the server at {0}:{1}. Confirm MYSQL_PATH points to mysql.exe from the selected WAMP MySQL installation, then retry.' -f $hostName, $port)
            }
            Write-ValidationError ('[ERROR] MySQL connection validation failed at {0}:{1} for user "{2}". In Wampserver Tools, confirm the default DBMS is MySQL and its port matches DB_PORT. Check DB_USERNAME and DB_PASSWORD in backend\.env, then retry.' -f $hostName, $port, $username)
        }

        Test-MySqlStorageEngine -Path $mysqlPath -OptionPath $optionPath

        $existsQuery = "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$safeDatabaseLiteral';"
        $existsResult = Invoke-MySqlQuery -Path $mysqlPath -Arguments @("--defaults-extra-file=$optionPath", '--batch', '--skip-column-names', "--execute=$existsQuery")
        $existsOutput = $existsResult.Output
        $existsExitCode = $existsResult.ExitCode
        if ($existsExitCode -ne 0) {
            $diagnostic = ($existsOutput -join ' ')
            if ($diagnostic -match '(?i)access denied') {
                Write-ValidationError ('[ERROR] Could not inspect MySQL databases as user "{0}". Check DB_USERNAME and DB_PASSWORD in backend\.env.' -f $username)
            }
            Write-ValidationError ('[ERROR] MySQL database validation failed for "{0}". Check the WAMP MySQL service and configured account, then retry.' -f $database)
        }

        $databaseMatches = @((($existsOutput -join "`n").Trim() -split "`r?`n" | Where-Object { $_.Trim() -eq $database }))
        $databaseExists = $databaseMatches.Count -gt 0
        if (-not $databaseExists) {
            if (-not $CreateIfMissing) {
                Write-ValidationError ('[ERROR] MySQL database "{0}" does not exist. Run setup.bat to create it, then retry doctor.' -f $database)
            }
            Write-Output ('[INFO] Database "{0}" does not exist. Creating it...' -f $database)
            $createQuery = 'CREATE DATABASE IF NOT EXISTS `{0}` CHARACTER SET {1} COLLATE {2};' -f $safeDatabase, $charset, $collation
            $createResult = Invoke-MySqlQuery -Path $mysqlPath -Arguments @("--defaults-extra-file=$optionPath", '--batch', '--skip-column-names', "--execute=$createQuery")
            $createOutput = $createResult.Output
            $createExitCode = $createResult.ExitCode
            if ($createExitCode -ne 0) {
                Write-ValidationError ('[ERROR] Database "{0}" does not exist and could not be created with the configured MySQL account. Run database\wamp-create-database.sql manually in MySQL, then retry setup.' -f $database)
            }
            Write-Output ('[OK] Database "{0}" created.' -f $database)
        }

        $databaseOptionFile = $baseOptionFile + "`r`n" + ('database={0}' -f $database)
        [IO.File]::WriteAllText($optionPath, $databaseOptionFile, (New-Object System.Text.UTF8Encoding($false)))
        $databaseResult = Invoke-MySqlQuery -Path $mysqlPath -Arguments @("--defaults-extra-file=$optionPath", '--batch', '--skip-column-names', '--execute=SELECT 1')
        $databaseOutput = $databaseResult.Output
        $databaseExitCode = $databaseResult.ExitCode
        if ($databaseExitCode -ne 0) {
            $diagnostic = ($databaseOutput -join ' ')
            if ($diagnostic -match '(?i)unknown database') {
                Write-ValidationError ('[ERROR] MySQL database "{0}" could not be selected. Run database\wamp-create-database.sql manually, then retry setup.' -f $database)
            }
            Write-ValidationError ('[ERROR] MySQL database "{0}" could not be accessed with user "{1}". Check database permissions and backend\.env, then retry.' -f $database, $username)
        }

        Normalize-FreshMigrationsTable -Path $mysqlPath -OptionPath $optionPath -Database $database -SafeDatabaseLiteral $safeDatabaseLiteral
    } finally {
        Remove-Item -LiteralPath $optionPath -Force -ErrorAction SilentlyContinue
    }
}

function Test-StorageLink {
    $link = Join-Path $Root 'backend\public\storage'
    $target = Join-Path $Root 'backend\storage\app\public'

    if (-not (Test-Path -LiteralPath $target -PathType Container)) {
        Write-ValidationError '[ERROR] The Laravel public storage target is missing: backend\storage\app\public. Run setup.bat again.'
    }
    if (-not (Test-Path -LiteralPath $link)) {
        Write-ValidationError '[ERROR] backend\public\storage is not linked to backend\storage\app\public. Run setup.bat to create the link.'
    }

    try {
        $item = Get-Item -LiteralPath $link -Force
    } catch {
        Write-ValidationError '[ERROR] backend\public\storage could not be inspected. It may be a broken link; run setup.bat again.'
    }

    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
        Write-ValidationError '[ERROR] backend\public\storage is not linked to backend\storage\app\public. Move unknown files aside and run setup.bat again.'
    }

    if (-not (Test-StorageLinkTarget -Link $link -Target $target)) {
        Write-ValidationError '[ERROR] backend\public\storage does not point to backend\storage\app\public. Remove the incorrect link and run setup.bat again.'
    }
}

function Test-StorageLinkTarget {
    param(
        [string]$Link,
        [string]$Target
    )

    # Resolve-Path does not reliably dereference Windows directory symlinks or
    # junctions. Verify the link semantically by writing a short-lived probe in
    # the intended target and reading it through public\storage.
    $probeName = '.alumnilink-storage-link-probe-{0}.tmp' -f [guid]::NewGuid().ToString('N')
    $targetProbe = Join-Path $target $probeName
    $linkProbe = Join-Path $link $probeName
    $probeValue = [guid]::NewGuid().ToString('N')
    $linkMatchesTarget = $false

    try {
        [IO.File]::WriteAllText($targetProbe, $probeValue, (New-Object System.Text.UTF8Encoding($false)))
        if (Test-Path -LiteralPath $linkProbe -PathType Leaf) {
            $linkMatchesTarget = [String]::Equals(
                [IO.File]::ReadAllText($linkProbe),
                $probeValue,
                [StringComparison]::Ordinal
            )
        }
    } catch {
        $linkMatchesTarget = $false
    } finally {
        Remove-Item -LiteralPath $targetProbe -Force -ErrorAction SilentlyContinue
    }

    return $linkMatchesTarget
}

function Prepare-StorageLink {
    $link = Join-Path $Root 'backend\public\storage'
    $target = Join-Path $Root 'backend\storage\app\public'

    if (-not (Test-Path -LiteralPath $target -PathType Container)) {
        Write-ValidationError '[ERROR] The Laravel public storage target is missing: backend\storage\app\public. Run setup.bat again.'
    }
    if (-not (Test-Path -LiteralPath $link)) {
        return
    }

    try {
        $item = Get-Item -LiteralPath $link -Force
    } catch {
        Write-ValidationError '[ERROR] backend\public\storage could not be inspected. It may be a broken link; move it aside and run setup.bat again.'
    }

    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 -or
        ($item.Attributes -band [IO.FileAttributes]::Directory) -eq 0) {
        Write-ValidationError '[ERROR] backend\public\storage already exists and is not a directory link. Move unknown files aside and run setup.bat again.'
    }

    if (Test-StorageLinkTarget -Link $link -Target $target) {
        return
    }

    try {
        [IO.Directory]::Delete($link, $false)
    } catch {
        Write-ValidationError '[ERROR] The incorrect backend\public\storage link could not be removed. Remove that directory link and run setup.bat again.'
    }

    if (Test-Path -LiteralPath $link) {
        Write-ValidationError '[ERROR] The incorrect backend\public\storage link could not be removed. Remove that directory link and run setup.bat again.'
    }
    Write-Output '[INFO] Removed an outdated backend\public\storage directory link.'
}

function Get-HttpResult {
    param([string]$Uri)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 10
        return @{ Status = [int]$response.StatusCode; Body = [string]$response.Content; Available = $true }
    } catch {
        $webResponse = $_.Exception.Response
        if ($null -eq $webResponse) {
            return @{ Available = $false }
        }

        $body = ''
        $stream = $webResponse.GetResponseStream()
        if ($null -ne $stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
        }

        return @{ Status = [int]$webResponse.StatusCode; Body = $body; Available = $true }
    }
}

function Get-AlumniLinkHostsPath {
    if (-not [string]::IsNullOrWhiteSpace($HostsPath)) {
        return [IO.Path]::GetFullPath($HostsPath)
    }

    $windowsRoot = $env:SystemRoot
    if ([string]::IsNullOrWhiteSpace($windowsRoot)) {
        $windowsRoot = 'C:\\Windows'
    }

    return Join-Path $windowsRoot 'System32\\drivers\\etc\\hosts'
}

function Get-AlumniLinkHostMappings {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw [IO.FileNotFoundException]::new(('Windows hosts file was not found at {0}.' -f $Path))
    }

    $mappings = @()
    foreach ($line in [IO.File]::ReadAllLines($Path)) {
        $active = ($line -split '#', 2)[0].Trim()
        if ([string]::IsNullOrWhiteSpace($active)) {
            continue
        }

        $parts = @($active -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($parts.Count -lt 2) {
            continue
        }

        $address = $parts[0]
        foreach ($hostName in $parts[1..($parts.Count - 1)]) {
            if ([String]::Equals($hostName, 'alumnilink.local', [StringComparison]::OrdinalIgnoreCase)) {
                $mappings += $address
            }
        }
    }

    return @($mappings)
}

function Set-AlumniLinkHostMapping {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw [IO.FileNotFoundException]::new(('Windows hosts file was not found at {0}.' -f $Path))
    }

    $updatedLines = New-Object System.Collections.Generic.List[string]
    foreach ($line in [IO.File]::ReadAllLines($Path)) {
        $commentIndex = $line.IndexOf('#')
        $activePart = if ($commentIndex -ge 0) { $line.Substring(0, $commentIndex) } else { $line }
        $commentPart = if ($commentIndex -ge 0) { $line.Substring($commentIndex) } else { '' }
        $trimmed = $activePart.Trim()

        if ([string]::IsNullOrWhiteSpace($trimmed)) {
            $updatedLines.Add($line)
            continue
        }

        $parts = @($trimmed -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($parts.Count -lt 2) {
            $updatedLines.Add($line)
            continue
        }

        $address = $parts[0]
        $hostNames = @($parts[1..($parts.Count - 1)])
        $remainingHosts = @($hostNames | Where-Object {
            -not [String]::Equals($_, 'alumnilink.local', [StringComparison]::OrdinalIgnoreCase)
        })

        if ($remainingHosts.Count -eq $hostNames.Count) {
            $updatedLines.Add($line)
            continue
        }

        # Preserve unrelated hostnames that shared the same hosts-file line.
        if ($remainingHosts.Count -gt 0) {
            $rewritten = $address + ' ' + ($remainingHosts -join ' ')
            if (-not [string]::IsNullOrWhiteSpace($commentPart)) {
                $rewritten += ' ' + $commentPart.TrimStart()
            }
            $updatedLines.Add($rewritten)
        } elseif (-not [string]::IsNullOrWhiteSpace($commentPart) -and
                  $commentPart -notmatch '(?i)^#\s*AlumniLink\s*$') {
            # Preserve a meaningful comment even when alumnilink.local was the
            # only hostname on the line.
            $updatedLines.Add($commentPart)
        }
    }

    $updatedLines.Add('127.0.0.1 alumnilink.local # AlumniLink')
    [IO.File]::WriteAllLines(
        $Path,
        $updatedLines,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Add-AlumniLinkHostMapping {
    $path = Get-AlumniLinkHostsPath
    Set-AlumniLinkHostMapping -Path $path

    $updatedMappings = @(Get-AlumniLinkHostMappings -Path $path)
    $incorrectMappings = @($updatedMappings | Where-Object { $_ -ne '127.0.0.1' })
    if ($updatedMappings.Count -ne 1 -or
        $updatedMappings[0] -ne '127.0.0.1' -or
        $incorrectMappings.Count -gt 0) {
        Write-ValidationError '[ERROR] The Windows hosts entry could not be corrected to 127.0.0.1 alumnilink.local. Check hosts-file permissions and retry setup.'
    }

    try {
        & ipconfig.exe /flushdns | Out-Null
    } catch {
        # The hosts file is authoritative; doctor.bat performs final resolution
        # validation even if the DNS cache flush command is unavailable.
    }

    exit 0
}

function Ensure-AlumniLinkHostMapping {
    $path = Get-AlumniLinkHostsPath
    $mappings = @(Get-AlumniLinkHostMappings -Path $path)
    $incorrectMappings = @($mappings | Where-Object { $_ -ne '127.0.0.1' })

    if ($mappings.Count -eq 1 -and
        $mappings[0] -eq '127.0.0.1' -and
        $incorrectMappings.Count -eq 0) {
        Write-Output '[INFO] Existing Windows hosts entry found for alumnilink.local.'
        Write-Output '[OK] Windows hosts entry is correct: 127.0.0.1 alumnilink.local.'
        return
    }

    if ($mappings.Count -gt 0) {
        Write-Output ('[INFO] Existing Windows hosts entry for alumnilink.local needs correction ({0}).' -f ($mappings -join ', '))
        Write-Output '[INFO] Correcting alumnilink.local to 127.0.0.1. Approve the administrator prompt.'
    } else {
        Write-Output '[INFO] alumnilink.local is not present in the Windows hosts file.'
        Write-Output '[INFO] Adding 127.0.0.1 alumnilink.local. Approve the administrator prompt.'
    }

    $scriptArgument = '"{0}"' -f $PSCommandPath
    try {
        $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -ArgumentList @(
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            $scriptArgument,
            '-Action',
            'AddHostMapping'
        )
    } catch {
        Write-ValidationError '[ERROR] Administrator permission is required to configure alumnilink.local in the Windows hosts file. Approve the UAC prompt and retry setup.'
    }

    if ($process.ExitCode -ne 0) {
        Write-ValidationError '[ERROR] The Windows hosts entry could not be configured. Approve the administrator prompt and confirm the hosts file is writable.'
    }

    $mappings = @(Get-AlumniLinkHostMappings -Path $path)
    $incorrectMappings = @($mappings | Where-Object { $_ -ne '127.0.0.1' })
    if ($mappings.Count -ne 1 -or
        $mappings[0] -ne '127.0.0.1' -or
        $incorrectMappings.Count -gt 0) {
        Write-ValidationError '[ERROR] alumnilink.local was not corrected to 127.0.0.1. Check the Windows hosts file and retry setup.'
    }

    Write-Output '[OK] Windows hosts entry configured: 127.0.0.1 alumnilink.local.'
}

function Find-WampApache {
    if (-not [string]::IsNullOrWhiteSpace($ApachePath)) {
        $candidate = [IO.Path]::GetFullPath($ApachePath)
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return $candidate
        }
        Write-ValidationError ('[ERROR] Configured Apache executable was not found: {0}' -f $candidate)
    }

    $running = Get-CimInstance Win32_Process -Filter "Name='httpd.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ExecutablePath -match '(?i)\\wamp(64)?\\bin\\apache\\apache[^\\]+\\bin\\httpd\.exe$' } |
        Select-Object -First 1

    if ($null -ne $running -and -not [string]::IsNullOrWhiteSpace([string]$running.ExecutablePath)) {
        return [IO.Path]::GetFullPath([string]$running.ExecutablePath)
    }

    foreach ($wampRoot in @('C:\wamp64', 'C:\wamp')) {
        $apacheRoot = Join-Path $wampRoot 'bin\apache'
        if (-not (Test-Path -LiteralPath $apacheRoot -PathType Container)) {
            continue
        }

        $candidate = Get-ChildItem -LiteralPath $apacheRoot -Filter httpd.exe -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '(?i)\\apache[^\\]+\\bin\\httpd\.exe$' } |
            Sort-Object FullName -Descending |
            Select-Object -First 1

        if ($null -ne $candidate) {
            return $candidate.FullName
        }
    }

    Write-ValidationError '[ERROR] WAMP Apache could not be found. Start WAMP Apache or install WAMP under C:\wamp64 or C:\wamp, then retry setup.'
}

function Get-WampPhpVersionForApache {
    param([string]$HttpdPath)

    $apacheVersionRoot = Split-Path -Parent (Split-Path -Parent $HttpdPath)
    $wampRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $apacheVersionRoot))
    $phpRoot = Join-Path $wampRoot 'bin\php'

    if (-not (Test-Path -LiteralPath $phpRoot -PathType Container)) {
        Write-ValidationError '[ERROR] WAMP PHP installations could not be found. Install PHP 8.4 or newer in WAMP, then retry setup.'
    }

    $candidates = Get-ChildItem -LiteralPath $phpRoot -Directory -ErrorAction SilentlyContinue |
        ForEach-Object {
            $match = [regex]::Match($_.Name, '^php(?<version>\d+\.\d+\.\d+)$')
            if (-not $match.Success) {
                return
            }

            try {
                $version = [version]$match.Groups['version'].Value
            } catch {
                return
            }

            if ($version -lt [version]'8.4.0') {
                return
            }

            $cgi = Join-Path $_.FullName 'php-cgi.exe'
            $ini = Join-Path $_.FullName 'php.ini'
            if ((Test-Path -LiteralPath $cgi -PathType Leaf) -and
                (Test-Path -LiteralPath $ini -PathType Leaf)) {
                [pscustomobject]@{
                    Version = $version
                    VersionText = $match.Groups['version'].Value
                }
            }
        } |
        Sort-Object Version -Descending

    # Prefer the PHP version already enabled in WAMP Apache. Choosing the
    # newest directory can select an installed addon that Windows blocks or
    # that has not been configured for this Apache instance.
    $httpdConfigPath = Join-Path $apacheVersionRoot 'conf\httpd.conf'
    if (Test-Path -LiteralPath $httpdConfigPath -PathType Leaf) {
        $httpdConfig = [IO.File]::ReadAllText($httpdConfigPath)
        $activePhpMatch = [regex]::Match(
            $httpdConfig,
            '(?im)^\s*LoadModule\s+php_module\s+[^\r\n]*?php(?<version>\d+\.\d+\.\d+)[\\/]php[^\\/]*\.dll'
        )
        if ($activePhpMatch.Success) {
            $activeVersion = [version]$activePhpMatch.Groups['version'].Value
            $activeCandidate = @($candidates | Where-Object { $_.Version -eq $activeVersion } | Select-Object -First 1)
            if ($activeCandidate.Count -gt 0) {
                return $activeCandidate[0]
            }
        }
    }

    $selected = @($candidates | Select-Object -First 1)
    if ($selected.Count -eq 0) {
        Write-ValidationError '[ERROR] WAMP PHP 8.4 or newer with php-cgi.exe was not found. Install/enable a PHP 8.4+ WAMP addon, then retry setup.'
    }

    return $selected[0]
}

function Get-ApacheConfigPaths {
    param([string]$HttpdPath)

    $apacheVersionRoot = Split-Path -Parent (Split-Path -Parent $HttpdPath)
    $vhostsPath = Join-Path $apacheVersionRoot 'conf\extra\httpd-vhosts.conf'
    if (-not (Test-Path -LiteralPath $vhostsPath -PathType Leaf)) {
        Write-ValidationError ('[ERROR] WAMP Apache virtual-host config was not found: {0}' -f $vhostsPath)
    }

    return [pscustomobject]@{
        ApacheRoot = $apacheVersionRoot
        VhostsPath = $vhostsPath
    }
}

function New-AlumniLinkVhostConfig {
    param([string]$PhpVersion)

    $template = Join-Path $Root 'apache\alumnilink-vhost.conf.template'
    $output = Join-Path $Root 'apache\alumnilink-vhost.conf'
    if (-not (Test-Path -LiteralPath $template -PathType Leaf)) {
        Write-ValidationError '[ERROR] apache\alumnilink-vhost.conf.template is missing from the client delivery.'
    }

    $rootForward = $Root.TrimEnd('\').Replace('\', '/')
    $content = [IO.File]::ReadAllText($template)
    $content = $content.Replace('__ALUMNILINK_ROOT__', $rootForward)
    $content = $content.Replace('__PHP_VERSION__', $PhpVersion)

    [IO.File]::WriteAllText(
        $output,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )

    return $output
}

function Set-ApacheInclude {
    param(
        [string]$VhostsPath,
        [string]$IncludePath
    )

    $normalizedInclude = $IncludePath.Replace('\', '/')
    $targetLine = 'Include "' + $normalizedInclude + '"'
    $lines = New-Object System.Collections.Generic.List[string]

    foreach ($line in [IO.File]::ReadAllLines($VhostsPath)) {
        if ($line -match '(?i)^\s*Include\s+["'']?[^"'']*alumnilink-vhost\.conf["'']?\s*$') {
            continue
        }
        $lines.Add($line)
    }

    if ($lines.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($lines[$lines.Count - 1])) {
        $lines.Add('')
    }

    $lines.Add('# AlumniLink managed virtual host')
    $lines.Add($targetLine)

    [IO.File]::WriteAllLines(
        $VhostsPath,
        $lines,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Invoke-ApacheCheck {
    param(
        [string]$HttpdPath,
        [string[]]$Arguments
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& $HttpdPath @Arguments 2>&1)
        return [pscustomobject]@{
            Output = $output
            ExitCode = $LASTEXITCODE
        }
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Install-AlumniLinkApacheConfig {
    $httpdPath = Find-WampApache
    $paths = Get-ApacheConfigPaths -HttpdPath $httpdPath
    $php = Get-WampPhpVersionForApache -HttpdPath $httpdPath
    $vhostConfig = New-AlumniLinkVhostConfig -PhpVersion $php.VersionText

    $backupPath = $paths.VhostsPath + '.alumnilink-backup'
    Copy-Item -LiteralPath $paths.VhostsPath -Destination $backupPath -Force

    try {
        Set-ApacheInclude -VhostsPath $paths.VhostsPath -IncludePath $vhostConfig

        $syntax = Invoke-ApacheCheck -HttpdPath $httpdPath -Arguments @('-t')
        if ($syntax.ExitCode -ne 0) {
            Copy-Item -LiteralPath $backupPath -Destination $paths.VhostsPath -Force
            $diagnostic = (($syntax.Output | ForEach-Object { [string]$_ }) -join ' ').Trim()
            Write-ValidationError ('[ERROR] Apache rejected the AlumniLink virtual-host configuration. The previous config was restored. {0}' -f $diagnostic)
        }

        $vhosts = Invoke-ApacheCheck -HttpdPath $httpdPath -Arguments @('-S')
        $dumpText = ($vhosts.Output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
        if ($vhosts.ExitCode -ne 0 -or $dumpText -notmatch '(?i)alumnilink\.local') {
            Copy-Item -LiteralPath $backupPath -Destination $paths.VhostsPath -Force
            Write-ValidationError '[ERROR] Apache accepted the config file but did not register alumnilink.local. The previous config was restored.'
        }
    } finally {
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
    }

    exit 0
}

function Ensure-AlumniLinkApacheConfig {
    $httpdPath = Find-WampApache
    $paths = Get-ApacheConfigPaths -HttpdPath $httpdPath
    $php = Get-WampPhpVersionForApache -HttpdPath $httpdPath
    $vhostConfig = New-AlumniLinkVhostConfig -PhpVersion $php.VersionText
    $includeForward = $vhostConfig.Replace('\', '/')

    $includePattern = '(?i)^\s*Include\s+["'']?' + [regex]::Escape($includeForward) + '["'']?\s*$'
    $includePresent = @(
        [IO.File]::ReadAllLines($paths.VhostsPath) |
            Where-Object { $_ -match $includePattern }
    ).Count -gt 0

    $dump = Invoke-ApacheCheck -HttpdPath $httpdPath -Arguments @('-S')
    $dumpText = ($dump.Output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    $registered = $dump.ExitCode -eq 0 -and $dumpText -match '(?i)alumnilink\.local'

    if ($includePresent -and $registered) {
        Write-Output ('[INFO] Existing Apache virtual host found for alumnilink.local using WAMP PHP {0} FCGI.' -f $php.VersionText)
        Write-Output '[OK] Apache virtual-host configuration is correct.'
        return
    }

    if ($includePresent) {
        Write-Output '[INFO] AlumniLink Apache include exists but alumnilink.local is not registered correctly.'
    } else {
        Write-Output '[INFO] AlumniLink Apache virtual host is not installed.'
    }

    Write-Output ('[INFO] Installing alumnilink.local for WAMP PHP {0} FCGI. Approve the administrator prompt.' -f $php.VersionText)
    $scriptArgument = '"{0}"' -f $PSCommandPath

    try {
        $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -ArgumentList @(
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            $scriptArgument,
            '-Action',
            'InstallApacheConfig'
        )
    } catch {
        Write-ValidationError '[ERROR] Administrator permission is required to configure the WAMP Apache virtual host. Approve the UAC prompt and retry setup.'
    }

    if ($process.ExitCode -ne 0) {
        Write-ValidationError '[ERROR] The WAMP Apache virtual host could not be configured. Approve the administrator prompt and retry setup.'
    }

    $dump = Invoke-ApacheCheck -HttpdPath $httpdPath -Arguments @('-S')
    $dumpText = ($dump.Output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    if ($dump.ExitCode -ne 0 -or $dumpText -notmatch '(?i)alumnilink\.local') {
        Write-ValidationError '[ERROR] alumnilink.local is still not registered in Apache after configuration.'
    }

    Write-Output ('[OK] Apache virtual host configured for alumnilink.local with WAMP PHP {0} FCGI.' -f $php.VersionText)
    Write-Output '[INFO] Restart WAMP Apache so the running server loads the updated virtual-host configuration.'
}

function Test-HostResolution {
    try {
        $addresses = [Net.Dns]::GetHostAddresses('alumnilink.local') | ForEach-Object { $_.IPAddressToString }
    } catch {
        Write-ValidationError '[ERROR] alumnilink.local could not be resolved. Run setup.bat to configure the Windows hosts entry, then retry.'
    }

    if ($addresses -notcontains '127.0.0.1') {
        Write-ValidationError '[ERROR] alumnilink.local does not resolve to 127.0.0.1. Correct any conflicting Windows hosts entry, then rerun setup.bat.'
    }
}

function Test-SpaHealth {
    $result = Get-HttpResult -Uri 'http://alumnilink.local/'
    if (-not $result.Available) {
        Write-ValidationError '[ERROR] AlumniLink SPA could not be reached at http://alumnilink.local/. Confirm WAMP Apache and the virtual host are running.'
    }
    if ($result.Status -ne 200 -or $result.Body -notmatch 'id=.root') {
        Write-ValidationError '[ERROR] AlumniLink SPA health check failed. Confirm Apache points to backend\public and that the compiled SPA is present.'
    }
}

function Test-ApiHealth {
    $uri = 'http://alumnilink.local/api/system/health'
    $result = $null
    $json = $null

    # mod_fcgid can briefly return its own 503 while it is starting or
    # recycling PHP workers. Give that transient response a chance to clear
    # before failing the full preflight.
    for ($attempt = 1; $attempt -le 4; $attempt++) {
        $result = Get-HttpResult -Uri $uri
        if ($result.Available) {
            try {
                $json = $result.Body | ConvertFrom-Json
            } catch {
                $json = $null
            }

            if ($null -ne $json -or $result.Status -notin @(502, 503, 504)) {
                break
            }
        }

        if ($attempt -lt 4) {
            Start-Sleep -Seconds 2
        }
    }

    if (-not $result.Available) {
        Write-ValidationError '[ERROR] AlumniLink API health check could not connect after retrying. Confirm WAMP Apache and PHP are running, then check apache\apache-error.log.'
    }
    if ($null -eq $json) {
        Write-ValidationError ('[ERROR] AlumniLink API health check returned HTTP {0} instead of JSON after retrying. Check apache\apache-error.log for PHP worker saturation or startup errors.' -f $result.Status)
    }
    if ($result.Status -ne 200 -or $json.status -ne 'ok' -or $json.database -ne 'ok') {
        Write-ValidationError '[ERROR] AlumniLink API responded, but its database health check failed. Confirm WAMP MySQL is running and backend\.env has the correct DB_DATABASE, DB_USERNAME, and DB_PASSWORD.'
    }
}

function Test-SensitiveFileProtection {
    foreach ($path in @('/.env', '/config.php', '/backup.sql')) {
        $result = Get-HttpResult -Uri ('http://alumnilink.local' + $path)
        if (-not $result.Available) {
            Write-ValidationError '[ERROR] Apache sensitive-file protection could not be checked. Confirm the virtual host is running and retry.'
        }
        if ($result.Status -eq 200 -and $result.Body -match 'id=.root') {
            Write-ValidationError ("[ERROR] Apache returned the SPA fallback for {0}. Configure the sensitive-file rules in backend\public\.htaccess and retry." -f $path)
        }
        if ($result.Status -eq 200) {
            Write-ValidationError ("[ERROR] Apache may be exposing the sensitive file {0}. Check backend\public\.htaccess and the virtual host." -f $path)
        }
        if ($result.Status -notin @(403, 404)) {
            Write-ValidationError ("[ERROR] Apache returned an unexpected response for {0}. Check the virtual host and sensitive-file rules." -f $path)
        }
    }
}

try {
    if ($Action -eq 'AddHostMapping') {
        Add-AlumniLinkHostMapping
        exit 0
    }

    if ($Action -eq 'EnsureHostMapping') {
        Ensure-AlumniLinkHostMapping
        exit 0
    }

    if ($Action -eq 'InstallApacheConfig') {
        Install-AlumniLinkApacheConfig
        exit 0
    }

    if ($Action -eq 'EnsureApacheConfig') {
        Ensure-AlumniLinkApacheConfig
        exit 0
    }

    if ($Action -eq 'PrepareStorageLink') {
        Prepare-StorageLink
        exit 0
    }

    $envPath = Join-Path $Root 'backend\.env'

    if ($Action -eq 'RecordCommand') {
        Write-CommandLog -CapturedOutputPath $InputPath -CommandStage $Stage -CommandExitCode $ExitCode -ExplicitLogPath $LogPath
        exit 0
    }

    if ($Action -eq 'ValidateEnvironment') {
        $values = Read-DotEnv -Path $envPath
        Test-Environment -Values $values
        if ($CheckDatabase) {
            Test-MySqlTools -Values $values
            Test-MySqlDatabaseConnection -Values $values -CreateIfMissing
        }
        exit 0
    }

    if ($Action -ne 'Doctor') {
        throw [ArgumentException]::new('Unsupported helper action.')
    }

    if ($StorageOnly) {
        Test-StorageLink
        exit 0
    }

    $values = Read-DotEnv -Path $envPath
    Test-Environment -Values $values
    Test-MySqlTools -Values $values
    Test-MySqlDatabaseConnection -Values $values

    if ($BackupOnly) {
        exit 0
    }

    Test-HostResolution
    Test-SpaHealth
    Test-ApiHealth
    Test-StorageLink
    Test-SensitiveFileProtection
    exit 0
} catch [FormatException] {
    $formatMessage = $_.Exception.Message
    if ($formatMessage.StartsWith('[ERROR]')) {
        Write-ValidationError $formatMessage
    }
    Write-ValidationError '[ERROR] backend\.env could not be parsed. Check the file format and try again.'
} catch {
    Write-InternalFailure -ErrorRecord $_
}

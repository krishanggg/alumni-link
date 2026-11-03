[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop')]
    [string]$Action,

    [ValidateSet('expo', 'development-build', 'web')]
    [string]$Client = 'development-build',

    [switch]$BackendOnly
)

$ErrorActionPreference = 'Stop'
$RepoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$MobileConsoleScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'mobile-dev-console.ps1'))
$StateDir = if ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA 'AlumniLink'
} else {
    Join-Path $env:TEMP 'AlumniLink'
}
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null

function Get-LanIPv4 {
    if ($env:MOBILE_HOST_IP) {
        $parsed = $null
        if (-not [Net.IPAddress]::TryParse($env:MOBILE_HOST_IP, [ref]$parsed)) {
            throw "MOBILE_HOST_IP is not a valid IP address: $($env:MOBILE_HOST_IP)"
        }
        return $env:MOBILE_HOST_IP
    }

    $candidates = Get-NetIPConfiguration |
        Where-Object {
            $_.NetAdapter.Status -eq 'Up' -and
            $_.IPv4Address -and
            $_.IPv4DefaultGateway
        } |
        ForEach-Object {
            foreach ($address in $_.IPv4Address) {
                $ip = $address.IPAddress
                if ($ip -notmatch '^127\.' -and $ip -notmatch '^169\.254\.') {
                    [pscustomobject]@{
                        IP = $ip
                        Metric = if ($_.NetIPv4Interface) { $_.NetIPv4Interface.InterfaceMetric } else { 9999 }
                        InterfaceAlias = $_.InterfaceAlias
                    }
                }
            }
        } |
        Sort-Object Metric, IP

    if (-not $candidates) {
        throw 'No active LAN IPv4 address with a default gateway was found. Connect the PC and phone to the same network, or set MOBILE_HOST_IP explicitly.'
    }

    if ($candidates.Count -gt 1) {
        Write-Host '[INFO] Multiple LAN adapters were detected; using the lowest-metric adapter.'
        foreach ($candidate in $candidates) {
            Write-Host ('       {0} - {1}' -f $candidate.IP, $candidate.InterfaceAlias)
        }
    }

    return $candidates[0].IP
}

function Write-ConsoleState {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][int]$ProcessId,
        [Parameter(Mandatory = $true)][long]$StartTimeUtcTicks,
        [Parameter(Mandatory = $true)][string]$Mode,
        [Parameter(Mandatory = $true)][string]$Client,
        [Parameter(Mandatory = $true)][string]$HostIp
    )

    $state = [ordered]@{
        Version = 1
        ProcessId = $ProcessId
        StartTimeUtcTicks = [string]$StartTimeUtcTicks
        Mode = $Mode
        Client = $Client
        HostIp = $HostIp
        ConsoleScript = $MobileConsoleScript
        RepoRoot = $RepoRoot
    }
    $json = ConvertTo-Json -InputObject $state -Compress
    [IO.File]::WriteAllText($Path, $json, (New-Object Text.UTF8Encoding($false)))
}

function Get-ConsoleStatus {
    param([Parameter(Mandatory = $true)][string]$StateFile)

    if (-not (Test-Path -LiteralPath $StateFile)) {
        return [pscustomobject]@{ Status = 'missing' }
    }

    $rawState = ([IO.File]::ReadAllText($StateFile, [Text.Encoding]::UTF8)).Trim()
    $legacyState = $false
    $processId = 0
    if ($rawState -match '^\d+$') {
        $legacyState = $true
        if (-not [int]::TryParse($rawState, [ref]$processId)) {
            return [pscustomobject]@{ Status = 'invalid' }
        }
        $savedState = $null
    } else {
        try {
            $savedState = $rawState | ConvertFrom-Json -ErrorAction Stop
        } catch {
            return [pscustomobject]@{ Status = 'invalid' }
        }
        if ($savedState.Version -ne 1 -or -not [int]::TryParse([string]$savedState.ProcessId, [ref]$processId)) {
            return [pscustomobject]@{ Status = 'invalid' }
        }
    }

    try {
        $processInfo = Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = {0}' -f $processId) -ErrorAction Stop
    } catch {
        return [pscustomobject]@{ Status = 'unverified'; ProcessId = $processId }
    }
    if (-not $processInfo) {
        return [pscustomobject]@{ Status = 'stale'; ProcessId = $processId }
    }

    $consoleScript = $MobileConsoleScript
    $expectedScriptArgument = '-File "{0}"' -f $consoleScript
    $expectedRootArgument = '-RepoRoot "{0}"' -f $RepoRoot
    $commandLine = [string]$processInfo.CommandLine
    if ([string]::IsNullOrEmpty($commandLine)) {
        return [pscustomobject]@{ Status = 'unverified'; ProcessId = $processId }
    }
    if ($processInfo.Name -ine 'powershell.exe' -or
        $commandLine.IndexOf($expectedScriptArgument, [StringComparison]::OrdinalIgnoreCase) -lt 0 -or
        $commandLine.IndexOf($expectedRootArgument, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        return [pscustomobject]@{ Status = 'stale'; ProcessId = $processId }
    }

    $modeArgument = [regex]::Match($commandLine, '(?i)(?:^|\s)-Mode\s+(?<value>[^\s]+)')
    $clientArgument = [regex]::Match($commandLine, '(?i)(?:^|\s)-Client\s+(?<value>[^\s]+)')
    $hostArgument = [regex]::Match($commandLine, '(?i)(?:^|\s)-HostIp\s+(?<value>[^\s]+)')
    if (-not $modeArgument.Success -or -not $clientArgument.Success -or -not $hostArgument.Success) {
        return [pscustomobject]@{ Status = 'unverified'; ProcessId = $processId }
    }

    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        $startTimeUtcTicks = [long]$process.StartTime.ToUniversalTime().Ticks
    } catch {
        return [pscustomobject]@{ Status = 'stale'; ProcessId = $processId }
    }

    $mode = $modeArgument.Groups['value'].Value
    $client = $clientArgument.Groups['value'].Value
    $hostIp = $hostArgument.Groups['value'].Value
    if (-not $legacyState) {
        $savedTicks = 0L
        if (-not [long]::TryParse([string]$savedState.StartTimeUtcTicks, [ref]$savedTicks) -or
            $savedTicks -ne $startTimeUtcTicks -or
            [string]$savedState.Mode -ne $mode -or
            [string]$savedState.Client -ne $client -or
            [string]$savedState.HostIp -ne $hostIp -or
            [string]$savedState.ConsoleScript -ine $consoleScript -or
            [string]$savedState.RepoRoot -ine $RepoRoot) {
            return [pscustomobject]@{ Status = 'unverified'; ProcessId = $processId }
        }
    } else {
        # Older releases stored only a PID. Adopt it only after the live process
        # command line proves it is this repository's mobile console.
        Write-ConsoleState -Path $StateFile -ProcessId $processId -StartTimeUtcTicks $startTimeUtcTicks -Mode $mode -Client $client -HostIp $hostIp
    }

    return [pscustomobject]@{
        Status = 'owned'
        ProcessId = $processId
        StartTimeUtcTicks = $startTimeUtcTicks
        Mode = $mode
        Client = $client
        HostIp = $hostIp
    }
}

function Stop-JustStartedConsole {
    param([Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process)

    try {
        if ($Process.HasExited) { return $true }
        & taskkill.exe /PID ([string]$Process.Id) /T /F | Out-Null
        if ($LASTEXITCODE -eq 0 -or $Process.HasExited) { return $true }
    } catch {
        try { if ($Process.HasExited) { return $true } } catch { }
    }

    return $false
}

function Start-ConsoleProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Mode,
        [Parameter(Mandatory = $true)][string]$Client,
        [Parameter(Mandatory = $true)][string]$HostIp,
        [Parameter(Mandatory = $true)][string]$PidFile,
        [Parameter(Mandatory = $true)][string]$LogFile
    )

    $existingConsole = Get-ConsoleStatus -StateFile $PidFile
    if ($existingConsole.Status -eq 'owned') {
        $matchesRequestedSession = $existingConsole.Mode -eq $Mode
        if ($Mode -eq 'metro') {
            $matchesRequestedSession = $matchesRequestedSession -and
                $existingConsole.Client -eq $Client -and
                $existingConsole.HostIp -eq $HostIp
        }
        if (-not $matchesRequestedSession) {
            throw ("An AlumniLink Mobile {0} console is already running for client '{1}' at {2}. Run stop-mobile-dev.bat before changing the client or network." -f $Mode, $existingConsole.Client, $existingConsole.HostIp)
        }
        Write-Host "[INFO] AlumniLink Mobile $Mode console is already running."
        return [pscustomobject]@{ Started = $false; ProcessId = $existingConsole.ProcessId }
    }
    if ($existingConsole.Status -eq 'unverified' -or $existingConsole.Status -eq 'invalid') {
        throw "The saved AlumniLink Mobile $Mode process state cannot be verified safely. Close its console window and remove $PidFile before retrying. No process was stopped."
    }
    if ($existingConsole.Status -eq 'stale') {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        Write-Host "[WARN] Removed stale $Mode process state. The process recorded by the old state was not stopped."
    }

    $consoleScript = $MobileConsoleScript
    $quotedScript = '"' + $consoleScript + '"'
    $quotedRoot = '"' + $RepoRoot + '"'
    $quotedLog = '"' + $LogFile + '"'
    $argumentLine = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File $quotedScript -Mode $Mode -Client $Client -RepoRoot $quotedRoot -HostIp $HostIp -LogPath $quotedLog"
    if ($Mode -eq 'metro') {
        # Expo's terminal UI needs the keyboard attached to its console. Keep
        # Metro in the window that launched this script instead of spawning a
        # second PowerShell window that can leave input focused elsewhere.
        $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentLine -NoNewWindow -PassThru
    } else {
        $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentLine -PassThru
    }
    try {
        $startTimeUtcTicks = [long]$process.StartTime.ToUniversalTime().Ticks
        Write-ConsoleState -Path $PidFile -ProcessId $process.Id -StartTimeUtcTicks $startTimeUtcTicks -Mode $Mode -Client $Client -HostIp $HostIp
    } catch {
        $stateFailure = $_.Exception.Message
        if (Stop-JustStartedConsole -Process $process) {
            Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
            throw "Could not record the AlumniLink Mobile $Mode console safely, so the console was stopped: $stateFailure"
        }
        throw "Could not record or stop the new AlumniLink Mobile $Mode console. Close its window manually, then remove $PidFile. Error: $stateFailure"
    }

    Start-Sleep -Seconds 2
    $startedConsole = Get-ConsoleStatus -StateFile $PidFile
    if ($startedConsole.Status -ne 'owned') {
        if (Stop-JustStartedConsole -Process $process) {
            Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
            throw "AlumniLink Mobile $Mode console identity could not be verified, so this launch was stopped. Check $LogFile."
        } else {
            throw "AlumniLink Mobile $Mode console identity could not be verified or safely stopped. Close its window manually; process state is kept at $PidFile."
        }
    }
    return [pscustomobject]@{ Started = $true; ProcessId = $process.Id }
}

function Stop-RecordedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$PidFile,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $recordedConsole = Get-ConsoleStatus -StateFile $PidFile
    if ($recordedConsole.Status -eq 'missing') {
        Write-Host "[INFO] $Label is not recorded as running."
        return
    }
    if ($recordedConsole.Status -eq 'stale') {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        Write-Host "[INFO] $Label was not running. Removed stale process state; no process was stopped."
        return
    }
    if ($recordedConsole.Status -ne 'owned') {
        throw "$Label process identity could not be verified. No process was stopped. Close the AlumniLink console manually, then remove $PidFile."
    }

    & taskkill.exe /PID ([string]$recordedConsole.ProcessId) /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $stillRecorded = Get-ConsoleStatus -StateFile $PidFile
        if ($stillRecorded.Status -eq 'owned') {
            throw "$Label could not be stopped."
        }
        if ($stillRecorded.Status -eq 'unverified' -or $stillRecorded.Status -eq 'invalid') {
            throw "$Label could not be confirmed stopped. Its state file was kept for safety."
        }
    }

    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] $Label stopped."
}

function Ensure-FirewallRule {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][int]$Port
    )

    $rule = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if ($rule) { return }

    Write-Host "[INFO] Windows Firewall needs a Private-network rule for TCP $Port."
    Write-Host '       A UAC prompt may appear.'
    $arguments = "advfirewall firewall add rule name=$Name dir=in action=allow protocol=TCP localport=$Port profile=private"
    $process = Start-Process -FilePath 'netsh.exe' -Verb RunAs -ArgumentList $arguments -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Could not create Windows Firewall rule $Name."
    }
}

$backendPid = Join-Path $StateDir 'mobile-backend.pid'
$metroPid = Join-Path $StateDir 'mobile-metro.pid'
$backendLog = Join-Path $StateDir 'mobile-backend.log'
$metroLog = Join-Path $StateDir 'mobile-metro.log'

if ($Action -eq 'stop') {
    $stopErrors = @()
    try { Stop-RecordedProcess -PidFile $metroPid -Label 'AlumniLink Mobile Metro' }
    catch { $stopErrors += $_.Exception.Message }
    try { Stop-RecordedProcess -PidFile $backendPid -Label 'AlumniLink Mobile Backend' }
    catch { $stopErrors += $_.Exception.Message }
    if ($stopErrors.Count -gt 0) {
        throw ($stopErrors -join ' ')
    }
    exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'backend\vendor\autoload.php'))) {
    throw 'Backend dependencies are missing. Run setup.bat first.'
}
if (-not $BackendOnly) {
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue) -or -not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js, npm, and npx are required. Install Node.js 22.13+ and rerun the mobile launcher.'
    }
    $nodeVersion = [version]((& node.exe --version).Trim().TrimStart('v'))
    if ($nodeVersion -lt [version]'22.13.0') {
        throw "Expo SDK 57 requires Node.js 22.13 or newer. Detected $nodeVersion."
    }

$mobileRoot = Join-Path $RepoRoot 'mobile'
Push-Location $mobileRoot
try {
    $expectedExpoVersion = [string](& node.exe -e "process.stdout.write(require('./package-lock.json').packages['node_modules/expo'].version || '')")
    $lockReadExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($lockReadExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($expectedExpoVersion)) {
    throw 'The mobile lockfile does not contain a readable Expo version. Restore mobile\package-lock.json before retrying.'
}
$expoPackagePath = Join-Path $mobileRoot 'node_modules\expo\package.json'
$expoCommandPath = Join-Path $mobileRoot 'node_modules\.bin\expo.cmd'
$installMarkerPath = Join-Path $mobileRoot 'node_modules\.alumnilink-install-state'
$packageManifestHash = (Get-FileHash -LiteralPath (Join-Path $mobileRoot 'package.json') -Algorithm SHA256).Hash
$lockfileHash = (Get-FileHash -LiteralPath (Join-Path $mobileRoot 'package-lock.json') -Algorithm SHA256).Hash
$expectedInstallMarker = "package=$packageManifestHash`nlock=$lockfileHash`nexpo=$expectedExpoVersion"
$installMarkerMatches = $false
if (Test-Path -LiteralPath $installMarkerPath) {
    try {
        $savedInstallMarker = Get-Content -LiteralPath $installMarkerPath -Raw -ErrorAction Stop
        $installMarkerMatches = $savedInstallMarker -ceq $expectedInstallMarker
    } catch {
        $installMarkerMatches = $false
    }
}
$expoInstallIsReady = $false
if ($installMarkerMatches -and (Test-Path -LiteralPath $expoPackagePath) -and (Test-Path -LiteralPath $expoCommandPath)) {
    try {
        $installedExpo = Get-Content -LiteralPath $expoPackagePath -Raw | ConvertFrom-Json
        $expoInstallIsReady = [string]$installedExpo.version -eq $expectedExpoVersion
    } catch {
        $expoInstallIsReady = $false
    }
}
if (-not $expoInstallIsReady) {
    Write-Host '[INFO] Expo dependencies are missing, incomplete, or stale. Installing the locked mobile dependencies with npm ci.'
    if (Test-Path -LiteralPath $installMarkerPath) {
        [IO.File]::Delete($installMarkerPath)
    }
    Push-Location $mobileRoot
    try {
        & npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw 'Mobile dependency installation failed.'
        }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path -LiteralPath $expoPackagePath) -or -not (Test-Path -LiteralPath $expoCommandPath)) {
        throw 'Mobile dependency installation completed without the Expo package and Windows command shim. Check the npm output and retry.'
    }
    try {
        $installedExpo = Get-Content -LiteralPath $expoPackagePath -Raw | ConvertFrom-Json
    } catch {
        throw 'The installed Expo package manifest could not be read. Remove mobile\node_modules and run the mobile launcher again.'
    }
    if ([string]$installedExpo.version -ne $expectedExpoVersion) {
        throw "The installed Expo version $($installedExpo.version) does not match the lockfile version $expectedExpoVersion. Remove mobile\node_modules and retry."
    }
    [IO.File]::WriteAllText($installMarkerPath, $expectedInstallMarker, (New-Object Text.UTF8Encoding($false)))
}
}
if (-not (Get-Command php.exe -ErrorAction SilentlyContinue)) {
    throw 'PHP is not available on PATH. Use the same PHP 8.4+ CLI configured for the WAMP installation.'
}

$hostIp = Get-LanIPv4
$apiUrl = 'http://{0}:8000/api' -f $hostIp

$profiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4Connectivity -ne 'Disconnected' }
if ($profiles -and ($profiles | Where-Object NetworkCategory -EQ 'Public')) {
    Write-Host '[WARN] At least one active network is marked Public.'
    Write-Host '       AlumniLink mobile firewall rules are intentionally Private-only.'
    Write-Host '       For reliable local development, use a trusted Private network.'
}

Ensure-FirewallRule -Name 'AlumniLink-Mobile-Backend-8000' -Port 8000
if (-not $BackendOnly) {
    Ensure-FirewallRule -Name 'AlumniLink-Mobile-Metro-8081' -Port 8081
}

Write-Host ''
Write-Host ('[INFO] LAN host: {0}' -f $hostIp)
Write-Host ('[INFO] Mobile API: {0}' -f $apiUrl)

$backendStart = $null
$metroStart = $null
try {
    $backendStart = Start-ConsoleProcess -Mode backend -Client $Client -HostIp $hostIp -PidFile $backendPid -LogFile $backendLog

    $healthy = $false
    for ($attempt = 1; $attempt -le 20; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/api/system/health' -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $healthy) {
        throw "Laravel mobile backend did not become healthy. Check $backendLog."
    }

    try {
        $lanResponse = Invoke-WebRequest -UseBasicParsing ('http://{0}:8000/api/system/health' -f $hostIp) -TimeoutSec 3
        if ($lanResponse.StatusCode -ne 200) {
            throw 'unexpected status'
        }
        Write-Host '[OK] Laravel backend is reachable through the selected LAN address.'
    } catch {
        throw "The backend works on localhost but not through $hostIp. Check the selected adapter and Windows Firewall."
    }

    if (-not $BackendOnly) {
        $metroStart = Start-ConsoleProcess -Mode metro -Client $Client -HostIp $hostIp -PidFile $metroPid -LogFile $metroLog
    }
} catch {
    $startupFailure = $_.Exception.Message
    if ($metroStart -and $metroStart.Started) {
        try { Stop-RecordedProcess -PidFile $metroPid -Label 'AlumniLink Mobile Metro' }
        catch { Write-Warning "Could not clean up the Metro console after startup failed: $($_.Exception.Message)" }
    }
    if ($backendStart -and $backendStart.Started) {
        try { Stop-RecordedProcess -PidFile $backendPid -Label 'AlumniLink Mobile Backend' }
        catch { Write-Warning "Could not clean up the backend console after startup failed: $($_.Exception.Message)" }
    }
    throw "Mobile startup failed: $startupFailure"
}

if ($BackendOnly) {
    Write-Host ''
    Write-Host '[OK] AlumniLink mobile backend is running.'
    Write-Host ('Backend: http://{0}:8000' -f $hostIp)
    Write-Host ('API:     {0}' -f $apiUrl)
    Write-Host ''
    Write-Host 'The standalone APK does not require Metro.'
    Write-Host 'Use stop-mobile-dev.bat when finished.'
    exit 0
}

Write-Host ''
Write-Host '[OK] AlumniLink mobile development is running.'
Write-Host ('Backend: http://{0}:8000' -f $hostIp)
Write-Host ('API:     {0}' -f $apiUrl)
Write-Host ('Metro:   http://{0}:8081' -f $hostIp)
Write-Host ''
if ($Client -eq 'expo') {
    if ($metroStart.Started) {
        Write-Host 'Open Expo Go on the same Private network and scan the QR in this launcher window titled "AlumniLink Mobile Metro".'
    } else {
        Write-Host 'Metro is already running. Use its original "AlumniLink Mobile Metro" window for the QR code and keyboard prompts.'
    }
} else {
    Write-Host 'Open the installed AlumniLink development APK on a phone connected to the same Private network.'
}
Write-Host 'React Native JavaScript/TypeScript edits use Fast Refresh; backend PHP edits apply on the next request.'
Write-Host 'Use stop-mobile-dev.bat when finished.'

# Keep the batch-launched PowerShell attached to the console while Metro is
# active. Otherwise an interactive cmd.exe prompt can resume in the same
# window and consume keyboard input intended for Expo.
if ($metroStart.Started) {
    Wait-Process -Id $metroStart.ProcessId -ErrorAction SilentlyContinue
}

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('backend', 'metro')]
    [string]$Mode,

    [ValidateSet('expo', 'development-build', 'web')]
    [string]$Client = 'development-build',

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$HostIp,

    [Parameter(Mandatory = $true)]
    [string]$LogPath
)

$ErrorActionPreference = 'Stop'
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$LogPath = [IO.Path]::GetFullPath($LogPath)
New-Item -ItemType Directory -Path (Split-Path -Parent $LogPath) -Force | Out-Null

if ($Mode -eq 'backend') {
    $label = 'AlumniLink Mobile Backend'
    $workingDirectory = Join-Path $RepoRoot 'backend'
    $host.UI.RawUI.WindowTitle = $label

    Write-Host ''
    Write-Host "=== $label ==="
    Write-Host ('Backend URL: http://{0}:8000' -f $HostIp)
    Write-Host ('Working directory: {0}' -f $workingDirectory)
    Write-Host ('Live log: {0}' -f $LogPath)
    Write-Host 'Keep this window open while developing. Use stop-mobile-dev.bat to stop it.'
    Write-Host ''

    Set-Location -LiteralPath $workingDirectory
    ('[{0}] starting {1}' -f (Get-Date -Format 's'), $label) | Tee-Object -FilePath $LogPath -Append

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & php artisan serve --host=0.0.0.0 --port=8000 2>&1 |
            Tee-Object -FilePath $LogPath -Append
        $nativeExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    exit $nativeExitCode
}

$label = 'AlumniLink Mobile Metro'
$workingDirectory = Join-Path $RepoRoot 'mobile'
$apiUrl = 'http://{0}:8000/api' -f $HostIp
$host.UI.RawUI.WindowTitle = $label
$env:EXPO_PUBLIC_API_URL = $apiUrl
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $HostIp
if (-not [string]::IsNullOrEmpty($env:CI) -or -not [string]::IsNullOrEmpty($env:EXPO_NO_QR_CODE)) {
    Write-Host '[INFO] Clearing inherited CI/EXPO_NO_QR_CODE values in this Metro console so Expo can show the QR; other processes are unaffected.'
}
$env:CI = $null
$env:EXPO_NO_QR_CODE = $null

Write-Host ''
Write-Host "=== $label ==="
Write-Host ('Metro host: {0}' -f $HostIp)
Write-Host ('Mobile API: {0}' -f $apiUrl)
Write-Host ('Working directory: {0}' -f $workingDirectory)
Write-Host ('Expo CLI stderr log: {0}' -f $LogPath)
Write-Host 'Keyboard shortcuts and Expo prompts are available in this window.'
if ($Client -eq 'expo') {
    Write-Host 'Fast Refresh is enabled. Open Expo Go and scan the QR code printed by Metro.'
} elseif ($Client -eq 'web') {
    Write-Host 'Fast Refresh is enabled. Expo will open AlumniLink Mobile in your browser.'
} else {
    Write-Host 'Fast Refresh is enabled. Open the installed AlumniLink development app and connect to this Metro server.'
}
Write-Host 'Keep this window open while developing. Use stop-mobile-dev.bat to stop it.'
Write-Host ''

Set-Location -LiteralPath $workingDirectory
('[{0}] starting {1}' -f (Get-Date -Format 's'), $label) | Tee-Object -FilePath $LogPath -Append

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    if ($Client -eq 'expo') {
        $expoArguments = @('expo', 'start', '--go', '--lan', '--port', '8081')
    } elseif ($Client -eq 'web') {
        $expoArguments = @('expo', 'start', '--web', '--lan', '--port', '8081')
    } else {
        $expoArguments = @('expo', 'start', '--dev-client', '--lan', '--port', '8081')
    }
    # Expo checks whether stdout is a terminal before rendering its Terminal UI and QR.
    # Keep stdout attached to this window and append only stderr diagnostics to the log.
    & npx.cmd @expoArguments 2>> $LogPath
    $nativeExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
exit $nativeExitCode

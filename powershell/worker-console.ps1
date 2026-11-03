[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('queue', 'scheduler')]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$Root,

    [Parameter(Mandatory = $true)]
    [string]$LogPath
)

$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
$LogPath = [IO.Path]::GetFullPath($LogPath)

$label = if ($Mode -eq 'queue') { 'AlumniLink Queue Worker' } else { 'AlumniLink Scheduler' }
$command = if ($Mode -eq 'queue') {
    @('artisan', 'queue:work', '--sleep=3', '--tries=3', '--timeout=90')
} else {
    @('artisan', 'schedule:run')
}

$host.UI.RawUI.WindowTitle = $label
New-Item -ItemType Directory -Path (Split-Path -Parent $LogPath) -Force | Out-Null

Write-Host ''
Write-Host ('=== {0} ===' -f $label)
Write-Host ('Working directory: {0}' -f $Root)
Write-Host ('Live log: {0}' -f $LogPath)
Write-Host 'Keep this window open while AlumniLink is running. Use stop.bat to stop it.'
Write-Host ''

Set-Location -LiteralPath $Root

$timestamp = '[{0}] starting {1}' -f (Get-Date -Format 's'), $label
$timestamp | Tee-Object -FilePath $LogPath -Append

try {
    if ($Mode -eq 'queue') {
        & php @command 2>&1 | Tee-Object -FilePath $LogPath -Append
        $exitCode = $LASTEXITCODE
    } else {
        while ($true) {
            & php @command 2>&1 | Tee-Object -FilePath $LogPath -Append
            $exitCode = $LASTEXITCODE

            if ($exitCode -ne 0) {
                break
            }

            Start-Sleep -Seconds 60
        }
    }
} catch {
    $_ | Out-String | Tee-Object -FilePath $LogPath -Append
    $exitCode = 1
}

Write-Host ''
Write-Host ('[{0}] exited with code {1}.' -f $label, $exitCode)
Write-Host 'Review the output above or the log file for details.'
exit $exitCode

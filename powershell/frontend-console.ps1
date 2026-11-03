[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Root,

    [Parameter(Mandatory = $true)]
    [string]$LogPath
)

$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
$LogPath = [IO.Path]::GetFullPath($LogPath)
$host.UI.RawUI.WindowTitle = 'AlumniLink Vite Frontend'

New-Item -ItemType Directory -Path (Split-Path -Parent $LogPath) -Force | Out-Null

Write-Host ''
Write-Host '=== AlumniLink Vite Frontend ==='
Write-Host ('Frontend source: {0}' -f $Root)
Write-Host 'Development URL: http://alumnilink.local:5173'
Write-Host ('Live log: {0}' -f $LogPath)
Write-Host 'Hot reload is enabled. Keep this window open while developing.'
Write-Host 'Use stop.bat to stop it.'
Write-Host ''

Set-Location -LiteralPath $Root
('[{0}] starting AlumniLink Vite Frontend' -f (Get-Date -Format 's')) |
    Tee-Object -FilePath $LogPath -Append

try {
    & npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort 2>&1 |
        Tee-Object -FilePath $LogPath -Append
    $exitCode = $LASTEXITCODE
} catch {
    $_ | Out-String | Tee-Object -FilePath $LogPath -Append
    $exitCode = 1
}

Write-Host ''
Write-Host ('[AlumniLink Vite Frontend] exited with code {0}.' -f $exitCode)
Write-Host 'Review the output above or the log file for details.'
exit $exitCode

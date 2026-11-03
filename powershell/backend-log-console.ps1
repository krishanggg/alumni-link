[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Root
)

$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
$logPath = Join-Path $Root 'storage\logs\laravel.log'
$logDirectory = Split-Path -Parent $logPath

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
if (-not (Test-Path -LiteralPath $logPath -PathType Leaf)) {
    New-Item -ItemType File -Path $logPath -Force | Out-Null
}

$host.UI.RawUI.WindowTitle = 'AlumniLink Laravel Backend Log'

Write-Host ''
Write-Host '=== AlumniLink Laravel Backend Log ==='
Write-Host ('Laravel log: {0}' -f $logPath)
Write-Host 'Showing the latest entries and following new backend/API log output live.'
Write-Host 'Keep this window open while AlumniLink is running. Use stop.bat to close it.'
Write-Host ''

try {
    Get-Content -LiteralPath $logPath -Tail 60 -Wait
} catch {
    Write-Host ''
    Write-Host '[ERROR] Laravel log streaming stopped unexpectedly.'
    Write-Host $_.Exception.Message
    exit 1
}

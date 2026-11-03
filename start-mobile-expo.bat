@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%powershell\mobile-dev.ps1" start expo
exit /b %ERRORLEVEL%

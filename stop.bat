@echo off
setlocal EnableExtensions
set "STATE_DIR=%LOCALAPPDATA%\AlumniLink"
if not defined LOCALAPPDATA set "STATE_DIR=%TEMP%\AlumniLink"

if /I "%~1"=="--help" (
  echo Stops AlumniLink queue worker, scheduler, Reverb, frontend, and backend log processes started by start.bat.
  echo WAMP Apache and MySQL are not changed.
  exit /b 0
)

call :stop_pid "%STATE_DIR%\queue-worker.pid" "AlumniLink Queue Worker"
if errorlevel 1 exit /b 1
call :stop_pid "%STATE_DIR%\scheduler.pid" "AlumniLink Scheduler"
if errorlevel 1 exit /b 1
call :stop_pid "%STATE_DIR%\reverb.pid" "AlumniLink Reverb Server"
if errorlevel 1 exit /b 1
call :stop_pid "%STATE_DIR%\backend-log.pid" "AlumniLink Laravel Backend Log"
if errorlevel 1 exit /b 1
call :stop_pid "%STATE_DIR%\vite.pid" "AlumniLink Vite Frontend"
if errorlevel 1 exit /b 1

echo AlumniLink frontend dev server, queue worker, scheduler, Reverb server, and backend log console stopped. WAMP Apache and MySQL were not changed.
exit /b 0

:stop_pid
set "PID_FILE=%~1"
set "PROCESS_LABEL=%~2"
set "TARGET_PID="
if not exist "%PID_FILE%" (
  echo [INFO] %PROCESS_LABEL% is not recorded as running.
  exit /b 0
)
set /p TARGET_PID=<"%PID_FILE%"
if not defined TARGET_PID (
  del /q "%PID_FILE%" >nul 2>&1
  exit /b 0
)

taskkill /PID %TARGET_PID% /T /F >nul 2>&1
if errorlevel 1 (
  powershell.exe -NoLogo -NoProfile -NonInteractive -Command "if (Get-Process -Id %TARGET_PID% -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
  if errorlevel 1 (
    echo [ERROR] %PROCESS_LABEL% could not be stopped.
    exit /b 1
  )
)

del /q "%PID_FILE%" >nul 2>&1
echo [OK] %PROCESS_LABEL% stopped.
exit /b 0

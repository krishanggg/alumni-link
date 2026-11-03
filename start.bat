@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "STATE_DIR=%LOCALAPPDATA%\AlumniLink"
if not defined LOCALAPPDATA set "STATE_DIR=%TEMP%\AlumniLink"
if not exist "%STATE_DIR%" mkdir "%STATE_DIR%" >nul 2>&1

if /I "%~1"=="--help" (
  echo Starts AlumniLink according to APP_STAGE in backend\.env.
  echo production: rebuilds the SPA, then serves it through WAMP Apache.
  echo development: starts Vite HMR at http://alumnilink.local:5173.
  echo Queue worker, scheduler, and Laravel backend log consoles are started in both modes.
  exit /b 0
)

if not exist "%ROOT%backend\vendor\autoload.php" (
  echo [ERROR] Dependencies are not installed. Run setup.bat first.
  exit /b 1
)
if not exist "%ROOT%backend\.env" (
  echo [ERROR] backend\.env is missing. Run setup.bat first.
  exit /b 1
)

set "APP_STAGE="
for /F "tokens=1,* delims==" %%A in ('findstr /B /I "APP_STAGE=" "%ROOT%backend\.env"') do set "APP_STAGE=%%B"
if not defined APP_STAGE (
  set "APP_STAGE=production"
  echo [INFO] APP_STAGE is not set; defaulting to production.
)

if /I "%APP_STAGE%"=="production" goto :production
if /I "%APP_STAGE%"=="development" goto :development

echo [ERROR] APP_STAGE must be production or development.
exit /b 1

:production
echo [INFO] APP_STAGE=production
echo [INFO] Rebuilding production frontend...
pushd "%ROOT%web" >nul || exit /b 1
call npm.cmd run build
set "BUILD_EXIT=%ERRORLEVEL%"
popd >nul
if not "%BUILD_EXIT%"=="0" (
  echo [ERROR] Production frontend build failed. Run setup.bat if dependencies are missing.
  exit /b 1
)
if not exist "%ROOT%backend\public\app\index.html" (
  echo [ERROR] Production frontend build did not create backend\public\app\index.html.
  exit /b 1
)
set "FRONTEND_URL=http://alumnilink.local"
goto :common_start

:development
echo [INFO] APP_STAGE=development
call :ensure_frontend
if errorlevel 1 exit /b 1
set "FRONTEND_URL=http://alumnilink.local:5173"

:common_start
call "%ROOT%doctor.bat"
if errorlevel 1 (
  echo [ERROR] WAMP/Apache preflight failed. Fix doctor.bat errors before starting services.
  exit /b 1
)

call :ensure_worker "queue-worker" "AlumniLink Queue Worker"
if errorlevel 1 exit /b 1
call :ensure_worker "scheduler" "AlumniLink Scheduler"
if errorlevel 1 exit /b 1
call :ensure_backend_log
if errorlevel 1 exit /b 1

timeout /t 2 /nobreak >nul
call "%ROOT%doctor.bat" --workers
if errorlevel 1 (
  echo [ERROR] A required AlumniLink background worker did not remain available.
  echo [INFO] Inspect %STATE_DIR%\queue-worker.log and %STATE_DIR%\scheduler.log for details.
  exit /b 1
)

start "" "%FRONTEND_URL%"
echo AlumniLink is healthy.
if /I "%APP_STAGE%"=="development" echo [INFO] Vite HMR: %FRONTEND_URL%
if /I "%APP_STAGE%"=="production" echo [INFO] Production SPA: %FRONTEND_URL%
echo [INFO] Worker logs: %STATE_DIR%\queue-worker.log and %STATE_DIR%\scheduler.log
echo [INFO] Backend log: %ROOT%backend\storage\logs\laravel.log
echo Use stop.bat to close AlumniLink consoles. WAMP Apache and MySQL are managed by WAMP.
exit /b 0

:ensure_frontend
set "PID_FILE=%STATE_DIR%\vite.pid"
set "LOG_FILE=%STATE_DIR%\vite.log"
call :pid_is_running "%PID_FILE%"
if not errorlevel 1 (
  echo [INFO] AlumniLink Vite Frontend is already running.
  exit /b 0
)
del /q "%PID_FILE%" >nul 2>&1
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$args=@('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File','%ROOT%powershell\frontend-console.ps1','-Root','%ROOT%web','-LogPath','%LOG_FILE%'); $p=Start-Process -FilePath 'powershell.exe' -ArgumentList $args -PassThru; [IO.File]::WriteAllText('%PID_FILE%', [string]$p.Id, (New-Object System.Text.UTF8Encoding($false)))"
if errorlevel 1 (
  echo [ERROR] Could not start AlumniLink Vite Frontend.
  exit /b 1
)
timeout /t 2 /nobreak >nul
call :pid_is_running "%PID_FILE%"
if errorlevel 1 (
  echo [ERROR] AlumniLink Vite Frontend exited immediately.
  echo [INFO] Check %LOG_FILE% for details.
  exit /b 1
)
echo [OK] AlumniLink Vite Frontend started with hot reload.
exit /b 0

:ensure_worker
set "WORKER_NAME=%~1"
set "WORKER_TITLE=%~2"
set "PID_FILE=%STATE_DIR%\%WORKER_NAME%.pid"
set "LOG_FILE=%STATE_DIR%\%WORKER_NAME%.log"
call :pid_is_running "%PID_FILE%"
if not errorlevel 1 (
  echo [INFO] %WORKER_TITLE% is already running.
  exit /b 0
)
del /q "%PID_FILE%" >nul 2>&1
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$mode='%WORKER_NAME%'; if ($mode -eq 'queue-worker') { $mode='queue' } else { $mode='scheduler' }; $args=@('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File','%ROOT%powershell\worker-console.ps1','-Mode',$mode,'-Root','%ROOT%backend','-LogPath','%LOG_FILE%'); $p=Start-Process -FilePath 'powershell.exe' -ArgumentList $args -PassThru; [IO.File]::WriteAllText('%PID_FILE%', [string]$p.Id, (New-Object System.Text.UTF8Encoding($false)))"
if errorlevel 1 exit /b 1
timeout /t 1 /nobreak >nul
call :pid_is_running "%PID_FILE%"
if errorlevel 1 (
  echo [ERROR] %WORKER_TITLE% exited immediately.
  echo [INFO] Check %LOG_FILE% for the Laravel error.
  exit /b 1
)
echo [OK] %WORKER_TITLE% started.
exit /b 0

:ensure_backend_log
set "PID_FILE=%STATE_DIR%\backend-log.pid"
call :pid_is_running "%PID_FILE%"
if not errorlevel 1 (
  echo [INFO] AlumniLink Laravel Backend Log is already running.
  exit /b 0
)
del /q "%PID_FILE%" >nul 2>&1
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$args=@('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File','%ROOT%powershell\backend-log-console.ps1','-Root','%ROOT%backend'); $p=Start-Process -FilePath 'powershell.exe' -ArgumentList $args -PassThru; [IO.File]::WriteAllText('%PID_FILE%', [string]$p.Id, (New-Object System.Text.UTF8Encoding($false)))"
if errorlevel 1 exit /b 1
timeout /t 1 /nobreak >nul
call :pid_is_running "%PID_FILE%"
if errorlevel 1 exit /b 1
echo [OK] AlumniLink Laravel Backend Log started.
exit /b 0

:pid_is_running
set "CHECK_PID="
if not exist "%~1" exit /b 1
set /p CHECK_PID=<"%~1"
if not defined CHECK_PID exit /b 1
powershell.exe -NoLogo -NoProfile -NonInteractive -Command "if (Get-Process -Id %CHECK_PID% -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %ERRORLEVEL%

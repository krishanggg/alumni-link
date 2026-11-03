@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "STATE_DIR=%LOCALAPPDATA%\AlumniLink"
if not defined LOCALAPPDATA set "STATE_DIR=%TEMP%\AlumniLink"
set "BACKUP_ONLY=0"
set "CHECK_WORKERS=0"
set "STORAGE_ONLY=0"

if /I "%~1"=="--help" (
  echo Checks the AlumniLink WAMP prerequisites and live HTTP health.
  echo.
  echo Usage: doctor.bat [--workers] [--storage-only] [--backup-only]
  exit /b 0
)
if /I "%~1"=="--workers" set "CHECK_WORKERS=1"
if /I "%~1"=="--backup" set "BACKUP_ONLY=0"
if /I "%~1"=="--backup-only" set "BACKUP_ONLY=1"
if /I "%~1"=="--storage-only" set "STORAGE_ONLY=1"

if not exist "%ROOT%backend\vendor\autoload.php" (
  echo [ERROR] Composer dependencies are missing. Run setup.bat first.
  exit /b 1
)
if not exist "%ROOT%backend\public\app\index.html" (
  echo [ERROR] The compiled SPA is missing. Run setup.bat to build it from web source.
  exit /b 1
)

php -r "exit(version_compare(PHP_VERSION, '8.4.0', '<') ? 1 : 0);"
if errorlevel 1 (
  echo [ERROR] CLI PHP 8.4 or newer is required.
  exit /b 1
)
for %%E in (curl dom fileinfo gd mbstring openssl pdo pdo_mysql session tokenizer xml xmlreader xmlwriter zip zlib) do (
  php -r "exit(extension_loaded('%%E') ? 0 : 1);"
  if errorlevel 1 (
    echo [ERROR] PHP extension %%E is not enabled for the CLI PHP.
    exit /b 1
  )
)

if "%STORAGE_ONLY%"=="1" goto :storage_only
if "%BACKUP_ONLY%"=="1" goto :backup_only
goto :full_doctor

:storage_only
call :run_helper "doctor storage validation" Doctor -StorageOnly
set "DOCTOR_EXIT=%ERRORLEVEL%"
if not "%DOCTOR_EXIT%"=="0" exit /b %DOCTOR_EXIT%
echo Laravel public storage link passed.
exit /b 0

:backup_only
call :run_helper "doctor backup validation" Doctor -BackupOnly
set "DOCTOR_EXIT=%ERRORLEVEL%"
if not "%DOCTOR_EXIT%"=="0" exit /b %DOCTOR_EXIT%
echo Backup and MySQL prerequisites passed.
exit /b 0

:full_doctor
call :run_helper "doctor validation" Doctor
set "DOCTOR_EXIT=%ERRORLEVEL%"
if not "%DOCTOR_EXIT%"=="0" exit /b %DOCTOR_EXIT%

if "%CHECK_WORKERS%"=="1" (
  call :pid_is_running "%STATE_DIR%\queue-worker.pid"
  if errorlevel 1 (
    echo [ERROR] AlumniLink queue worker process is not running.
    if exist "%STATE_DIR%\queue-worker.log" echo [INFO] Check %STATE_DIR%\queue-worker.log for details.
    exit /b 1
  )
  call :pid_is_running "%STATE_DIR%\scheduler.pid"
  if errorlevel 1 (
    echo [ERROR] AlumniLink scheduler process is not running.
    if exist "%STATE_DIR%\scheduler.log" echo [INFO] Check %STATE_DIR%\scheduler.log for details.
    exit /b 1
  )
)

echo AlumniLink doctor passed: PHP, WAMP MySQL tools, locked local DB profile, MySQL connection, storage link, host resolution, Apache SPA, sensitive-file checks, Laravel API/database health, and requested workers are available.
exit /b 0

:run_helper
set "HELPER_CONTEXT=%~1"
set "HELPER_ACTION=%~2"
set "HELPER_OPTION="
if /I "%~3"=="-BackupOnly" set "HELPER_OPTION=-BackupOnly"
if /I "%~3"=="-StorageOnly" set "HELPER_OPTION=-StorageOnly"
set "HELPER_STDERR=%TEMP%\AlumniLink-wamp-helper-%RANDOM%.err"
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%powershell\alumnilink-wamp.ps1" -Action "%HELPER_ACTION%" -Root "%ROOT%." %HELPER_OPTION% 2>"%HELPER_STDERR%"
set "HELPER_EXIT=%ERRORLEVEL%"
if "%HELPER_EXIT%"=="0" (
  del /q "%HELPER_STDERR%" >nul 2>&1
  exit /b 0
)
if "%HELPER_EXIT%"=="10" (
  del /q "%HELPER_STDERR%" >nul 2>&1
  exit /b 1
)
echo [ERROR] AlumniLink %HELPER_CONTEXT% encountered an internal script error.
echo [ERROR] Sanitized command diagnostics were retained at %HELPER_STDERR%.
exit /b 2


:pid_is_running
set "CHECK_PID="
if not exist "%~1" exit /b 1
set /p CHECK_PID=<"%~1"
if not defined CHECK_PID exit /b 1
powershell.exe -NoLogo -NoProfile -NonInteractive -Command "if (Get-Process -Id %CHECK_PID% -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %ERRORLEVEL%

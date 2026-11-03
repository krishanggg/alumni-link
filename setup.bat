@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"

if /I "%~1"=="--help" goto :help
pushd "%ROOT%" >nul || goto :fail
call :init_log

set "FAILED=0"
set "CURRENT_STAGE=Checking prerequisites"
echo [1/12] Checking prerequisites...
call :log_setup "%CURRENT_STAGE%" "START"
call :require_command php.exe "PHP 8.4+"
call :require_command composer.bat "Composer"
call :require_command node.exe "Node.js 20.19+ or 22.12+"
call :require_command npm.cmd "npm"
if "%FAILED%"=="1" goto :fail

php -r "exit(version_compare(PHP_VERSION, '8.4.0', '<') ? 1 : 0);"
if errorlevel 1 (
  echo [ERROR] PHP 8.4 or newer is required. The CLI PHP must match WAMP Apache PHP.
  goto :fail
)

for %%E in (curl dom fileinfo gd mbstring openssl pdo pdo_mysql session tokenizer xml xmlreader xmlwriter zip zlib) do (
  php -r "exit(extension_loaded('%%E') ? 0 : 1);"
  if errorlevel 1 (
    echo [ERROR] PHP extension %%E is not enabled. Enable it in the WAMP PHP used by this command.
    set "FAILED=1"
  )
)
if "%FAILED%"=="1" goto :fail

if not exist "backend\composer.json" (
  echo [ERROR] Run this helper from the root of the client-delivery folder.
  goto :fail
)
if not exist "web\package.json" (
  echo [ERROR] The frontend source is missing from this delivery. Obtain a generated client-delivery package.
  goto :fail
)
if not exist "web\package-lock.json" (
  echo [ERROR] The frontend lockfile is missing from this delivery. Obtain a generated client-delivery package.
  goto :fail
)

node -e "const [major,minor]=process.versions.node.split('.').map(Number); const supported=(major===20 && minor>=19) || (major>=22 && (major>22 || minor>=12)); process.exit(supported ? 0 : 1);"
if errorlevel 1 (
  echo [ERROR] Node.js 20.19 or newer, or Node.js 22.12 or newer, is required. Install a supported Node.js release and retry.
  goto :fail
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number); process.exit(major>22 || (major===22 && minor>=13) ? 0 : 1);"
if errorlevel 1 (
  echo [INFO] This Node.js version supports WAMP web setup, but Expo SDK 57 mobile tools require Node.js 22.13 or newer.
  echo [INFO] Upgrade Node.js before running build-apk.bat or start-mobile-expo.bat.
)
call npm.cmd --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm could not be started. Repair the Node.js installation and retry.
  goto :fail
)
echo [OK] Prerequisites are available.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Preparing WAMP environment configuration"
if not exist "backend\.env" (
  if not exist "backend\.env.wamp.example" (
    echo [ERROR] The WAMP environment template is missing: backend\.env.wamp.example
    goto :fail
  )
  copy /Y "backend\.env.wamp.example" "backend\.env" >nul
  if errorlevel 1 (
    echo [ERROR] Could not create backend\.env from the WAMP template. Check folder permissions, then retry setup.
    goto :fail
  )
  if not exist "backend\.env" (
    echo [ERROR] backend\.env was not created from the WAMP template. Check folder permissions, then retry setup.
    goto :fail
  )
  echo Created backend\.env from the WAMP template.
  echo The first run needs local database credentials and a private Super Admin password.
  start "" notepad.exe "%ROOT%backend\.env"
  pause
)

set "CURRENT_STAGE=Validating environment configuration"
echo [2/12] Validating environment configuration...
call :log_setup "%CURRENT_STAGE%" "START"
call :validate_environment
set "VALIDATION_EXIT=%ERRORLEVEL%"
if not "%VALIDATION_EXIT%"=="0" call :log_setup "%CURRENT_STAGE%" "VALIDATION_FAILED"
if "%VALIDATION_EXIT%"=="0" goto :environment_valid
if "%VALIDATION_EXIT%"=="2" goto :fail

echo.
echo Correct backend\.env using the message above, then retry setup.
start "" notepad.exe "%ROOT%backend\.env"
pause
call :validate_environment
set "VALIDATION_EXIT=%ERRORLEVEL%"
if not "%VALIDATION_EXIT%"=="0" goto :fail

:environment_valid

echo [OK] Environment configuration and MySQL credentials are valid.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Installing frontend dependencies"
echo [3/12] Installing frontend dependencies...
call :log_setup "%CURRENT_STAGE%" "START"
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
pushd "web" >nul
call npm.cmd ci --no-audit --no-fund --no-progress >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "%CURRENT_STAGE%" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Frontend dependency installation failed. Check the network or the frontend lockfile, then retry setup.
  goto :fail
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
echo [OK] Frontend dependencies installed.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Building frontend"
echo [4/12] Building frontend...
call :log_setup "%CURRENT_STAGE%" "START"
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
pushd "web" >nul
call npm.cmd run build >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "%CURRENT_STAGE%" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] The production frontend build failed. Correct the reported build issue and retry setup.
  goto :fail
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
if not exist "backend\public\app\index.html" (
  echo [ERROR] The frontend build did not create backend\public\app\index.html. Retry setup after checking the frontend source.
  goto :fail
)
echo [OK] Production frontend build created backend\public\app\index.html.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Preparing Laravel directories"
echo [5/12] Preparing Laravel directories...
call :log_setup "%CURRENT_STAGE%" "START"
for %%D in ("backend\storage\app\private" "backend\storage\app\public" "backend\storage\framework\cache\data" "backend\storage\framework\sessions" "backend\storage\framework\views" "backend\storage\logs" "backend\bootstrap\cache") do (
  if not exist "%%~D" mkdir "%%~D" >nul 2>&1
)
echo [OK] Laravel directories are ready.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Installing backend dependencies"
echo [6/12] Installing backend dependencies...
call :log_setup "%CURRENT_STAGE%" "START"
pushd "backend" >nul
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
call composer.bat install --no-dev --no-interaction --prefer-dist --no-progress --optimize-autoloader >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "%CURRENT_STAGE%" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Backend dependency installation failed. Check Composer, PHP extensions, and the network, then retry setup.
  goto :fail
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
echo [OK] Backend dependencies installed.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Checking MySQL and backup tools"
echo [7/12] Checking MySQL and backup tools...
call :log_setup "%CURRENT_STAGE%" "START"
call doctor.bat --backup-only
if errorlevel 1 goto :fail
echo [OK] MySQL and backup prerequisites passed.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Running database migrations"
echo [8/12] Running database migrations...
call :log_setup "%CURRENT_STAGE%" "START"
call :ensure_app_key
if errorlevel 1 goto :fail
pushd "backend" >nul

set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
call php artisan migrate --force >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "%CURRENT_STAGE%" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Database migrations failed. Check the MySQL database and backend\.env, then retry setup.
  goto :fail
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
echo [OK] Database migrations completed.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Creating initial Super Admin"
echo [9/12] Creating initial Super Admin...
call :log_setup "%CURRENT_STAGE%" "START"
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
pushd "backend" >nul
call php artisan db:seed --force >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "%CURRENT_STAGE%" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Initial Super Admin creation failed. Check the database and Super Admin settings in backend\.env, then retry setup.
  goto :fail
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
echo [OK] Initial Super Admin stage completed.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Finalizing cache and storage configuration"
echo [10/12] Finalizing cache and storage configuration...
call :log_setup "%CURRENT_STAGE%" "START"
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
pushd "backend" >nul
call php artisan optimize:clear --ansi >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
if not "%COMMAND_EXIT%"=="0" (
  popd >nul
  call :record_command "Laravel cache/configuration clearing" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Laravel cache/configuration clearing failed after migrations. Check backend\.env and retry setup.
  goto :fail
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
popd >nul

call :ensure_storage_link
if errorlevel 1 goto :fail

call doctor.bat --storage-only
if errorlevel 1 goto :fail

echo [OK] Cache and storage configuration verified.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Configuring local hostname"
echo [11/12] Configuring local hostname...
call :log_setup "%CURRENT_STAGE%" "START"
call :run_helper "local hostname configuration" EnsureHostMapping
if errorlevel 1 goto :fail
echo [OK] Local hostname configuration verified.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

set "CURRENT_STAGE=Configuring WAMP Apache"
echo [12/12] Configuring WAMP Apache...
call :log_setup "%CURRENT_STAGE%" "START"
call :run_helper "Apache virtual-host configuration" EnsureApacheConfig
if errorlevel 1 goto :fail
echo [OK] WAMP Apache virtual-host configuration verified.
call :log_setup "%CURRENT_STAGE%" "SUCCESS"

echo.
echo Setup complete.
echo [INFO] If WAMP Apache was already running, use WAMP tray ^> Restart All Services once so the new virtual host is loaded.
echo Then run doctor.bat followed by start.bat.
popd >nul
exit /b 0

:ensure_app_key
pushd "backend" >nul || exit /b 1
set "APP_KEY_VALUE="
for /F "tokens=1,* delims==" %%A in ('findstr /B "APP_KEY=" ".env"') do set "APP_KEY_VALUE=%%B"
if defined APP_KEY_VALUE (
  popd >nul
  exit /b 0
)
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
call php artisan key:generate --ansi >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "APP_KEY generation" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Laravel APP_KEY generation failed. Confirm PHP and backend permissions, then retry setup.
  exit /b 1
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
exit /b 0

:ensure_storage_link
pushd "backend" >nul || exit /b 1
call :run_helper "Laravel storage link preparation" PrepareStorageLink
if errorlevel 1 (
  popd >nul
  exit /b 1
)
if exist "public\storage" (
  popd >nul
  exit /b 0
)
set "COMMAND_OUTPUT=%TEMP%\AlumniLink-setup-%RANDOM%.log"
call php artisan storage:link >"%COMMAND_OUTPUT%" 2>&1
set "COMMAND_EXIT=%ERRORLEVEL%"
popd >nul
if not "%COMMAND_EXIT%"=="0" (
  call :record_command "Laravel storage link" "%COMMAND_OUTPUT%" "%COMMAND_EXIT%"
  del /q "%COMMAND_OUTPUT%" >nul 2>&1
  echo [ERROR] Could not create public\storage. Enable Windows Developer Mode or run this helper as an administrator, then retry.
  exit /b 1
)
del /q "%COMMAND_OUTPUT%" >nul 2>&1
exit /b 0

:validate_environment
call :run_helper "setup validation" ValidateEnvironment -CheckDatabase
if errorlevel 2 exit /b 2
if errorlevel 1 exit /b 1
exit /b 0

:run_helper
set "HELPER_CONTEXT=%~1"
set "HELPER_ACTION=%~2"
set "HELPER_OPTION="
if /I "%~3"=="-BackupOnly" set "HELPER_OPTION=-BackupOnly"
if /I "%~3"=="-StorageOnly" set "HELPER_OPTION=-StorageOnly"
if /I "%~3"=="-CheckDatabase" set "HELPER_OPTION=-CheckDatabase"
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

:record_command
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%powershell\alumnilink-wamp.ps1" -Action RecordCommand -Root "%ROOT%." -InputPath "%~2" -Stage "%~1" -ExitCode "%~3" -LogPath "%SETUP_LOG%" >nul 2>&1
exit /b 0

:log_setup
if defined SETUP_LOG >>"%SETUP_LOG%" echo [%DATE% %TIME%] stage=%~1 status=%~2
exit /b 0

:init_log
set "SETUP_LOG=%LOCALAPPDATA%\AlumniLink\setup.log"
if not defined LOCALAPPDATA set "SETUP_LOG=%TEMP%\AlumniLink\setup.log"
for %%D in ("%SETUP_LOG%") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>&1
>>"%SETUP_LOG%" echo [%DATE% %TIME%] stage=Setup status=START
if errorlevel 1 (
  set "SETUP_LOG=%TEMP%\AlumniLink-setup.log"
  for %%D in ("%SETUP_LOG%") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>&1
  >>"%SETUP_LOG%" echo [%DATE% %TIME%] stage=Setup status=START
)
exit /b 0

:require_command
where "%~1" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] %~2 was not found on PATH. Install it or add it to PATH, then retry.
  set "FAILED=1"
)
exit /b 0

:help
echo AlumniLink WAMP setup
echo.
echo Usage: setup.bat
echo.
echo The first run copies backend\.env.wamp.example and opens it in Notepad for
echo the administrator. Node.js/npm are required to install dependencies and
echo build the production SPA during setup and future updates. The helper
echo checks the configured MySQL credentials, verifies InnoDB support, and
echo creates the target database before npm or Composer work when it does not
echo exist. It then installs locked
echo production Composer dependencies, migrates and seeds only the initial Super
echo Admin, creates public storage, and ensures 127.0.0.1 alumnilink.local is
echo present in the Windows hosts file. A UAC prompt appears only when that hosts
echo entry must be added or corrected. Setup also generates and installs the
echo alumnilink.local WAMP Apache virtual host and binds it to a WAMP PHP 8.4+
echo FCGI runtime. It never overwrites an existing backend\.env. Progress and
echo sanitized diagnostics are written to
echo %%LOCALAPPDATA%%\AlumniLink\setup.log.
exit /b 0

:fail
call :log_setup "%CURRENT_STAGE%" "FAILED"
echo.
echo [ERROR] Setup failed during %CURRENT_STAGE%. Fix the message above and run setup.bat again.
if defined SETUP_LOG echo [INFO] Diagnostic log: %SETUP_LOG%
popd >nul 2>&1
exit /b 1

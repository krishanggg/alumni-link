[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$MobileRoot = Join-Path $RepoRoot 'mobile'
$SdkRoot = if ($env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT
} elseif ($env:ANDROID_HOME) {
    $env:ANDROID_HOME
} else {
    Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

function Write-Step([string]$Message) {
    Write-Host ''
    Write-Host ('=== {0} ===' -f $Message)
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath exited with code $LASTEXITCODE."
    }
}

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
                    }
                }
            }
        } |
        Sort-Object Metric, IP

    if (-not $candidates) {
        throw 'No active LAN IPv4 address with a default gateway was found. Connect this PC to the same network as the Android device, or set MOBILE_HOST_IP explicitly.'
    }

    return $candidates[0].IP
}

function Get-CompatibleTemurinHome {
    $roots = @()
    if ($env:JAVA_HOME) { $roots += $env:JAVA_HOME }
    $roots += Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName

    $compatible = foreach ($root in $roots | Select-Object -Unique) {
        $java = Join-Path $root 'bin\java.exe'
        $release = Join-Path $root 'release'
        if (-not (Test-Path -LiteralPath $java)) { continue }

        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = $java
        $processInfo.Arguments = '-version'
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()

        $versionText = $stdout + $stderr
        $releaseText = if (Test-Path -LiteralPath $release) { Get-Content -LiteralPath $release -Raw } else { '' }

        $major = $null
        if ($versionText -match 'version "(\d+)') {
            $major = [int]$Matches[1]
        }

        $isTemurin = $root -match 'Eclipse Adoptium' -or $releaseText -match 'IMPLEMENTOR="Eclipse Adoptium"'
        if ($isTemurin -and $major -ge 17 -and $major -le 21) {
            [pscustomobject]@{
                Home = [IO.Path]::GetFullPath($root)
                Major = $major
            }
        }
    }

    $selected = $compatible | Sort-Object Major -Descending | Select-Object -First 1
    if ($selected) {
        return $selected.Home
    }

    return $null
}

function Ensure-CompatibleTemurin {
    $jdkHome = Get-CompatibleTemurinHome
    if (-not $jdkHome) {
        Write-Step 'Installing Eclipse Temurin JDK 17'
        Write-Host '[INFO] No compatible Eclipse Temurin JDK 17-21 was found.'
        if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
            throw 'Eclipse Temurin JDK 17 or 21 is required and winget is not available. Install a supported Temurin JDK from Adoptium, then rerun build-apk.bat.'
        }

        $wingetArguments = @(
            'install'
            '--id'
            'EclipseAdoptium.Temurin.17.JDK'
            '--exact'
            '--interactive'
            '--accept-package-agreements'
            '--accept-source-agreements'
        )
        & winget.exe @wingetArguments
        $wingetExitCode = $LASTEXITCODE
        if ($wingetExitCode -ne 0) {
            if ($wingetExitCode -eq -1978334964) {
                throw 'WinGet reports the Temurin JDK installation was cancelled (installer exit code 1602). Complete or approve the installer prompts, then rerun build-apk.bat. You can also install Temurin JDK 17 or 21 manually from Adoptium and retry.'
            }

            throw "winget.exe exited with code $wingetExitCode while installing Temurin JDK 17."
        }

        $jdkHome = Get-CompatibleTemurinHome
        if (-not $jdkHome) {
            throw 'Temurin 17 installation completed but the JDK could not be located under C:\Program Files\Eclipse Adoptium.'
        }
    }

    $env:JAVA_HOME = $jdkHome
    $env:Path = "$(Join-Path $jdkHome 'bin');$env:Path"
    $releasePath = Join-Path $jdkHome 'release'
    $releaseText = if (Test-Path -LiteralPath $releasePath) { Get-Content -LiteralPath $releasePath -Raw } else { '' }
    $selectedMajor = if ($releaseText -match 'JAVA_VERSION="(\d+)') { $Matches[1] } else { '?' }
    Write-Host ('[OK] Eclipse Temurin JDK {0}: {1}' -f $selectedMajor, $jdkHome)
}

function Get-SdkManager {
    $preferred = Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
    if (Test-Path -LiteralPath $preferred) { return $preferred }

    $found = Get-ChildItem (Join-Path $SdkRoot 'cmdline-tools') -Filter sdkmanager.bat -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Install-AndroidCommandLineTools {
    Write-Step 'Installing Android SDK command-line tools'
    New-Item -ItemType Directory -Path $SdkRoot -Force | Out-Null
    $temp = Join-Path $env:TEMP ('alumnilink-android-tools-' + [Guid]::NewGuid().ToString('N'))
    $repositoryPath = Join-Path $temp 'repository.xml'
    $zip = Join-Path $temp 'command-line-tools.zip'
    try {
        New-Item -ItemType Directory -Path $temp -Force | Out-Null
        Invoke-WebRequest -UseBasicParsing 'https://dl.google.com/android/repository/repository2-1.xml' -OutFile $repositoryPath

        # Stream Google's large SDK catalog instead of materializing the entire
        # catalog as an XmlDocument and running a descendant XPath over it.
        $choices = New-Object 'System.Collections.Generic.List[object]'
        $reader = [System.Xml.XmlReader]::Create($repositoryPath)
        try {
            while ($reader.Read()) {
                if ($reader.NodeType -ne [System.Xml.XmlNodeType]::Element -or
                    $reader.LocalName -ne 'remotePackage') { continue }

                $packagePath = $reader.GetAttribute('path')
                if (-not $packagePath -or -not $packagePath.StartsWith('cmdline-tools;')) { continue }
                $version = $null
                if (-not [version]::TryParse(($packagePath -split ';', 2)[1], [ref]$version)) { continue }

                $packageReader = $reader.ReadSubtree()
                try {
                    while ($packageReader.Read()) {
                        if ($packageReader.NodeType -ne [System.Xml.XmlNodeType]::Element -or
                            $packageReader.LocalName -ne 'archive') { continue }

                        $archiveReader = $packageReader.ReadSubtree()
                        $hostOs = $null
                        $archiveUrl = $null
                        try {
                            while ($archiveReader.Read()) {
                                if ($archiveReader.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
                                if ($archiveReader.LocalName -eq 'host-os') {
                                    $hostOs = $archiveReader.ReadElementContentAsString()
                                } elseif ($archiveReader.LocalName -eq 'url') {
                                    $archiveUrl = $archiveReader.ReadElementContentAsString()
                                }
                            }
                        } finally {
                            $archiveReader.Close()
                        }

                        if ($hostOs -eq 'windows' -and $archiveUrl) {
                            $choices.Add([pscustomobject]@{
                                Version = $version
                                Url = 'https://dl.google.com/android/repository/' + $archiveUrl
                            })
                        }
                    }
                } finally {
                    $packageReader.Close()
                }
            }
        } finally {
            $reader.Close()
        }

        $choice = $choices | Sort-Object Version -Descending | Select-Object -First 1
        if (-not $choice) {
            throw 'Could not determine the current Windows Android command-line tools package.'
        }

        Invoke-WebRequest -UseBasicParsing $choice.Url -OutFile $zip
        Expand-Archive -LiteralPath $zip -DestinationPath $temp -Force

        $source = Join-Path $temp 'cmdline-tools'
        if (-not (Test-Path -LiteralPath $source)) {
            throw 'Downloaded Android command-line tools archive had an unexpected structure.'
        }

        $latest = Join-Path $SdkRoot 'cmdline-tools\latest'
        if (Test-Path -LiteralPath $latest) {
            Remove-Item -LiteralPath $latest -Recurse -Force
        }
        New-Item -ItemType Directory -Path (Split-Path -Parent $latest) -Force | Out-Null
        Move-Item -LiteralPath $source -Destination $latest
    } finally {
        Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Ensure-AndroidSdk {
    $sdkManager = Get-SdkManager
    if (-not $sdkManager) {
        Install-AndroidCommandLineTools
        $sdkManager = Get-SdkManager
    }
    if (-not $sdkManager) {
        throw 'Android sdkmanager could not be installed or located.'
    }

    $env:ANDROID_HOME = $SdkRoot
    $env:ANDROID_SDK_ROOT = $SdkRoot
    $platformTools = Join-Path $SdkRoot 'platform-tools'
    if ($env:Path -notlike "*$platformTools*") {
        $env:Path = "$platformTools;$env:Path"
    }

    Write-Step 'Accepting Android SDK licenses'
    (1..100 | ForEach-Object { 'y' }) | & $sdkManager "--sdk_root=$SdkRoot" --licenses | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw 'Android SDK license acceptance failed.'
    }

    Write-Step 'Installing Android SDK 36 build requirements'
    Invoke-Native $sdkManager "--sdk_root=$SdkRoot" 'platform-tools' 'platforms/android-36' 'build-tools/36.0.0'
    Write-Host "[OK] Android SDK: $SdkRoot"
}

function Ensure-Node {
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js and npm are required. Install Node.js 22.13 or newer, then rerun build-apk.bat.'
    }

    $raw = (& node.exe --version).Trim().TrimStart('v')
    $version = [version]$raw
    if ($version -lt [version]'22.13.0') {
        throw "Expo SDK 57 requires Node.js 22.13 or newer. Detected $raw."
    }
    Write-Host "[OK] Node.js $raw"
}

function Get-ExpectedMobileInstall {
    Push-Location $MobileRoot
    try {
        $expoVersion = [string](& node.exe -e "process.stdout.write(require('./package-lock.json').packages['node_modules/expo'].version || '')")
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($expoVersion)) {
            throw 'The mobile lockfile does not contain a readable Expo version. Restore mobile\package-lock.json before retrying.'
        }
    } finally {
        Pop-Location
    }

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $packageHash = [BitConverter]::ToString($sha256.ComputeHash([IO.File]::ReadAllBytes((Join-Path $MobileRoot 'package.json')))).Replace('-', '')
        $lockHash = [BitConverter]::ToString($sha256.ComputeHash([IO.File]::ReadAllBytes((Join-Path $MobileRoot 'package-lock.json')))).Replace('-', '')
    } finally {
        $sha256.Dispose()
    }
    return [pscustomobject]@{
        ExpoVersion = $expoVersion
        Marker = "package=$packageHash`nlock=$lockHash`nexpo=$expoVersion"
        MarkerPath = Join-Path $MobileRoot 'node_modules\.alumnilink-install-state'
        ExpoPackagePath = Join-Path $MobileRoot 'node_modules\expo\package.json'
        ExpoCommandPath = Join-Path $MobileRoot 'node_modules\.bin\expo.cmd'
    }
}

function Test-MobileInstallReady($ExpectedInstall) {
    if (-not (Test-Path -LiteralPath $ExpectedInstall.MarkerPath) -or
        -not (Test-Path -LiteralPath $ExpectedInstall.ExpoPackagePath) -or
        -not (Test-Path -LiteralPath $ExpectedInstall.ExpoCommandPath)) {
        return $false
    }
    try {
        $marker = Get-Content -LiteralPath $ExpectedInstall.MarkerPath -Raw -ErrorAction Stop
        $expo = Get-Content -LiteralPath $ExpectedInstall.ExpoPackagePath -Raw -ErrorAction Stop | ConvertFrom-Json
        if ($marker -cne $ExpectedInstall.Marker -or [string]$expo.version -ne $ExpectedInstall.ExpoVersion) {
            return $false
        }

        return (Test-LockedMobilePackages $ExpectedInstall)
    } catch {
        return $false
    }
}

function Test-LockedMobilePackages($ExpectedInstall) {
    $verifyScript = @'
const fs = require('fs');
const path = require('path');
const lock = require('./package-lock.json');
for (const [relativePath, expected] of Object.entries(lock.packages || {})) {
  if (!relativePath.startsWith('node_modules/') || expected.optional || expected.link) continue;
  const packageFile = path.join(process.cwd(), relativePath, 'package.json');
  try {
    const installed = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (installed.version !== expected.version) process.exitCode = 1;
  } catch {
    process.exitCode = 1;
  }
}
'@
    Push-Location $MobileRoot
    try {
        & node.exe -e $verifyScript
        return ($LASTEXITCODE -eq 0)
    } finally {
        Pop-Location
    }
}

function Assert-MobileMetroStopped {
    $stateDir = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'AlumniLink' } else { Join-Path $env:TEMP 'AlumniLink' }
    $statePath = Join-Path $stateDir 'mobile-metro.pid'
    $consoleScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'mobile-dev-console.ps1'))
    $expectedScript = '-File "{0}"' -f $consoleScript
    $expectedRoot = '-RepoRoot "{0}"' -f $RepoRoot
    if (-not (Test-Path -LiteralPath $statePath)) {
        try {
            $liveConsoleProcesses = Get-CimInstance -ClassName Win32_Process -ErrorAction Stop |
                Where-Object { $_.Name -ieq 'powershell.exe' }
        } catch {
            throw 'Mobile Metro state is missing and live PowerShell processes cannot be inspected safely. Close any AlumniLink Metro window, then retry build-apk.bat. No dependency changes were made.'
        }
        foreach ($liveProcess in $liveConsoleProcesses) {
            if ([string]::IsNullOrWhiteSpace([string]$liveProcess.CommandLine)) {
                throw 'A live PowerShell process command line cannot be inspected while Metro state is missing. Close any AlumniLink Metro window, then retry build-apk.bat. No dependency changes were made.'
            }
            $line = [string]$liveProcess.CommandLine
            if ($line.IndexOf($expectedScript, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
                $line.IndexOf($expectedRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
                $line -match '(?i)(?:^|\s)-Mode\s+metro(?:\s|$)') {
                throw 'AlumniLink Mobile Metro is running from this checkout, but its process record is missing. Close its original console window, then rerun build-apk.bat. The build left node_modules untouched.'
            }
        }
        return
    }

    try {
        $rawState = Get-Content -LiteralPath $statePath -Raw -ErrorAction Stop
    } catch {
        throw 'The saved AlumniLink Mobile Metro state cannot be read safely. Close the Metro console, verify it has stopped, then remove its state file and retry build-apk.bat. No dependency changes were made.'
    }

    $legacyState = $rawState.Trim() -match '^\d+$'
    if ($legacyState) {
        $processId = 0
        if (-not [int]::TryParse($rawState.Trim(), [ref]$processId) -or $processId -le 0) {
            throw 'The saved AlumniLink Mobile Metro state is invalid. Verify Metro is stopped and remove its state file before retrying build-apk.bat.'
        }
        $state = $null
    } else {
        try {
            $state = $rawState | ConvertFrom-Json -ErrorAction Stop
            $processId = 0
            if ($state.Version -ne 1 -or -not [int]::TryParse([string]$state.ProcessId, [ref]$processId) -or $processId -le 0) {
                throw 'invalid state'
            }
        } catch {
            throw 'The saved AlumniLink Mobile Metro state is invalid. Verify Metro is stopped and remove its state file before retrying build-apk.bat.'
        }
    }

    try {
        $processInfo = Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = {0}' -f $processId) -ErrorAction Stop
    } catch {
        throw 'The saved AlumniLink Mobile Metro process cannot be verified. Close the Metro console and retry build-apk.bat; dependencies were left untouched.'
    }
    if (-not $processInfo) { return }

    $commandLine = [string]$processInfo.CommandLine
    if ($legacyState) {
        throw 'A legacy AlumniLink Mobile Metro process record points to a live process that cannot be verified safely. Verify the recorded process is stopped before removing mobile-metro.pid and retrying build-apk.bat. No dependency changes were made.'
    }

    $savedStartTicks = 0L
    if (-not [long]::TryParse([string]$state.StartTimeUtcTicks, [ref]$savedStartTicks)) {
        throw 'The saved AlumniLink Mobile Metro process start time is invalid. Verify Metro is stopped before removing its state file and retrying build-apk.bat. No dependency changes were made.'
    }

    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        $processStartTicks = [string]$process.StartTime.ToUniversalTime().Ticks
    } catch {
        throw 'The saved AlumniLink Mobile Metro process start time cannot be verified. Close the Metro console and retry build-apk.bat; dependencies were left untouched.'
    }
    if ($processStartTicks -ne [string]$state.StartTimeUtcTicks) { return }

    $identityMatches = $processInfo.Name -ieq 'powershell.exe' -and
        $commandLine.IndexOf($expectedScript, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
        $commandLine.IndexOf($expectedRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
        [string]$state.RepoRoot -ieq $RepoRoot
    if (-not $identityMatches) {
        throw 'The saved AlumniLink Mobile Metro process identity cannot be verified. Close the recorded console and retry build-apk.bat; dependencies were left untouched.'
    }
    throw 'AlumniLink Mobile Metro is running from this checkout. Close its console or run stop-mobile-dev.bat, then rerun build-apk.bat. The build left the running session and node_modules untouched.'
}

function Install-MobileDependencies($ExpectedInstall) {
    if (Test-Path -LiteralPath $ExpectedInstall.MarkerPath) {
        Remove-Item -LiteralPath $ExpectedInstall.MarkerPath -Force
    }
    Push-Location $MobileRoot
    try {
        Invoke-Native npm.cmd ci --no-audit --no-fund
    } finally {
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath $ExpectedInstall.ExpoPackagePath) -or
        -not (Test-Path -LiteralPath $ExpectedInstall.ExpoCommandPath)) {
        throw 'Mobile dependency installation completed without the Expo package and Windows command shim. Check the npm output and retry.'
    }
    try {
        $expo = Get-Content -LiteralPath $ExpectedInstall.ExpoPackagePath -Raw | ConvertFrom-Json
    } catch {
        throw 'The installed Expo package manifest could not be read. Retry build-apk.bat after closing programs that may be using mobile\node_modules.'
    }
    if ([string]$expo.version -ne $ExpectedInstall.ExpoVersion) {
        throw "The installed Expo version $($expo.version) does not match the lockfile version $($ExpectedInstall.ExpoVersion). Retry build-apk.bat after closing programs that may be using mobile\node_modules."
    }
    if (-not (Test-LockedMobilePackages $ExpectedInstall)) {
        throw 'Mobile dependency installation completed, but one or more required locked packages are missing or at the wrong version. Retry build-apk.bat after closing programs that may be using mobile\node_modules.'
    }
    [IO.File]::WriteAllText($ExpectedInstall.MarkerPath, $ExpectedInstall.Marker, (New-Object Text.UTF8Encoding($false)))
}

function Enable-LocalCleartext {
    $manifest = Join-Path $MobileRoot 'android\app\src\main\AndroidManifest.xml'
    if (-not (Test-Path -LiteralPath $manifest)) {
        throw 'Generated AndroidManifest.xml was not found after Expo prebuild.'
    }

    $text = Get-Content -LiteralPath $manifest -Raw
    if ($text -match 'android:usesCleartextTraffic=') {
        $text = [regex]::Replace($text, 'android:usesCleartextTraffic="[^"]*"', 'android:usesCleartextTraffic="true"')
    } else {
        $text = $text -replace '<application\b', '<application android:usesCleartextTraffic="true"'
    }
    [IO.File]::WriteAllText($manifest, $text, (New-Object Text.UTF8Encoding($false)))
}

if (-not (Test-Path -LiteralPath (Join-Path $MobileRoot 'package.json'))) {
    throw "Mobile project not found at $MobileRoot"
}

Write-Step 'Checking local mobile build prerequisites'
Ensure-Node
Ensure-CompatibleTemurin
Ensure-AndroidSdk

$lanIp = Get-LanIPv4
$apiUrl = 'http://{0}:8000/api' -f $lanIp
Write-Host "[OK] Local mobile API will use: $apiUrl"

$env:EXPO_PUBLIC_API_URL = $apiUrl
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
$env:NODE_ENV = 'production'
if ($env:ALUMNILINK_LOCAL_DEV -match '^(0|false|no)$') {
    $env:ALUMNILINK_LOCAL_DEV = '0'
} elseif ($env:ALUMNILINK_LOCAL_DEV -match '^(1|true|yes)$') {
    $env:ALUMNILINK_LOCAL_DEV = '1'
} else {
    $googleServicesPath = Join-Path $MobileRoot 'google-services.json'
    $hasDevFirebaseClient = $false
    if (Test-Path -LiteralPath $googleServicesPath) {
        try {
            $googleServices = Get-Content -LiteralPath $googleServicesPath -Raw | ConvertFrom-Json
            $hasDevFirebaseClient = @($googleServices.client | Where-Object {
                $_.client_info.android_client_info.package_name -eq 'com.app.alumnilink.dev'
            }).Count -gt 0
        } catch {
            $hasDevFirebaseClient = $false
        }
    }
    $env:ALUMNILINK_LOCAL_DEV = if ($hasDevFirebaseClient) { '1' } else { '0' }
}
$androidPackage = if ($env:ALUMNILINK_LOCAL_DEV -eq '1') { 'com.app.alumnilink.dev' } else { 'com.app.alumnilink' }
Write-Host "[INFO] Android application ID: $androidPackage"

Write-Step 'Checking mobile dependencies'
$expectedInstall = Get-ExpectedMobileInstall
if (Test-MobileInstallReady $expectedInstall) {
    Write-Host '[OK] Reusing mobile dependencies verified against package.json and package-lock.json.'
} else {
    Assert-MobileMetroStopped
    Write-Host '[INFO] Installing the locked mobile dependencies with npm ci.'
    Install-MobileDependencies $expectedInstall
}
Push-Location $MobileRoot
try {
    Write-Step 'Generating Android project'
    Invoke-Native npx.cmd expo prebuild --platform android --clean

    Enable-LocalCleartext

    $gradleProperties = Join-Path $MobileRoot 'android\gradle.properties'
    $gradlePropertiesText = [IO.File]::ReadAllText($gradleProperties)
    $gradleJvmArgs = 'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=2g'
    if ($gradlePropertiesText -match '(?m)^org\.gradle\.jvmargs=.*$') {
        $gradlePropertiesText = [regex]::Replace($gradlePropertiesText, '(?m)^org\.gradle\.jvmargs=.*$', $gradleJvmArgs)
    } else {
        $gradlePropertiesText += [Environment]::NewLine + $gradleJvmArgs + [Environment]::NewLine
    }
    [IO.File]::WriteAllText($gradleProperties, $gradlePropertiesText, (New-Object Text.UTF8Encoding($false)))

    $localProperties = Join-Path $MobileRoot 'android\local.properties'
    $sdkProperty = $SdkRoot.Replace('\', '/')
    $localPropertiesText = 'sdk.dir={0}{1}' -f $sdkProperty, [Environment]::NewLine
    [IO.File]::WriteAllText($localProperties, $localPropertiesText, (New-Object Text.UTF8Encoding($false)))

    Write-Step 'Bundling JavaScript and building standalone APK'
    Push-Location (Join-Path $MobileRoot 'android')
    try {
        Invoke-Native (Join-Path $MobileRoot 'android\gradlew.bat') assembleRelease --stacktrace
    } finally {
        Pop-Location
    }

    $sourceApk = Join-Path $MobileRoot 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $sourceApk)) {
        throw 'Gradle completed but app-release.apk was not found.'
    }

    $dist = Join-Path $MobileRoot 'dist'
    New-Item -ItemType Directory -Path $dist -Force | Out-Null
    $targetApk = Join-Path $dist 'AlumniLink-standalone.apk'
    Copy-Item -LiteralPath $sourceApk -Destination $targetApk -Force

    Write-Host ''
    Write-Host '[OK] Standalone APK built successfully. Its JavaScript bundle and LAN API URL are embedded.'
    Write-Host "APK: $targetApk"
    Write-Host "Backend expected at: $apiUrl"
    Write-Host ''
    Write-Host 'Install the APK on the Android device once.'
    Write-Host 'The APK does not need Metro. Start the Laravel mobile backend with start-mobile-dev.bat when the API is needed.'
} finally {
    Pop-Location
}

@echo off
setlocal enabledelayedexpansion

echo 🚀 Assignment Tracker APK Builder
echo ==================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm detected

REM Check if icon files exist
if not exist "icon-192x192.png" (
    echo ⚠️  Icon files missing. Opening icon generator...
    start create-icons.html
    echo Please generate and download the icon files, then run this script again.
    pause
    exit /b 1
)

if not exist "icon-512x512.png" (
    echo ⚠️  Icon files missing. Opening icon generator...
    start create-icons.html
    echo Please generate and download the icon files, then run this script again.
    pause
    exit /b 1
)

echo ✅ Icon files found

REM Check if Android SDK is available
if "%ANDROID_HOME%"=="" (
    echo ⚠️  ANDROID_HOME environment variable is not set.
    echo Please install Android Studio and set ANDROID_HOME to your Android SDK path.
    echo Example: set ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
    echo.
    echo Alternative: We can use PWA Builder for cloud-based APK generation.
    set /p choice="Do you want to use PWA Builder cloud service? (y/n): "
    if /i "!choice!"=="y" goto pwa_builder
    pause
    exit /b 1
)

echo ✅ Android SDK found at: %ANDROID_HOME%

REM Install PWA Builder CLI
echo 📦 Installing PWA Builder CLI...
npm install -g @pwabuilder/cli

if errorlevel 1 (
    echo ❌ Failed to install PWA Builder CLI
    pause
    exit /b 1
)

echo ✅ PWA Builder CLI installed

REM Create a temporary directory for the build
set BUILD_DIR=assignment-tracker-apk
if exist "%BUILD_DIR%" (
    echo 🧹 Cleaning previous build...
    rmdir /s /q "%BUILD_DIR%"
)

echo 📁 Creating build directory...
mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

REM Copy all project files
echo 📋 Copying project files...
copy ..\*.html . >nul 2>&1
copy ..\*.js . >nul 2>&1
copy ..\*.css . >nul 2>&1
copy ..\*.json . >nul 2>&1
copy ..\*.png . >nul 2>&1

REM Start a local server to serve the files
echo 🌐 Starting local server...
start /b npx http-server -p 8080 -c-1

REM Wait for server to start
echo ⏳ Waiting for server to be ready...
timeout /t 5 /nobreak >nul

REM Build APK using PWA Builder
echo 🔨 Building APK with PWA Builder...
pwabuilder build android --manifest http://localhost:8080/manifest.json --packageId com.assignmenttracker.app

if errorlevel 1 (
    echo ❌ Failed to build APK with PWA Builder
    taskkill /f /im node.exe >nul 2>&1
    pause
    exit /b 1
)

REM Stop the server
taskkill /f /im node.exe >nul 2>&1

REM Copy the APK to the parent directory
if exist "*.apk" (
    for %%f in (*.apk) do (
        copy "%%f" ..\assignment-tracker.apk
        echo ✅ APK built successfully: assignment-tracker.apk
    )
) else (
    echo ❌ APK file not found. Build may have failed.
    pause
    exit /b 1
)

REM Clean up
cd ..
rmdir /s /q "%BUILD_DIR%"

echo 🎉 APK build completed successfully!
echo 📱 You can now install assignment-tracker.apk on your Android device.
goto end

:pwa_builder
echo 🌐 Using PWA Builder cloud service...
echo 📋 Please visit: https://www.pwabuilder.com/android
echo 📋 Enter your app URL: http://localhost:8080
echo 📋 Follow the instructions to download your APK
echo.
echo 🚀 Starting local server for testing...
start npx http-server -p 8080 -c-1
echo ✅ Server started at http://localhost:8080
echo 📱 You can now test your PWA and build the APK using PWA Builder

:end
echo.
echo 📋 Installation Instructions:
echo 1. Enable "Unknown Sources" in your Android device settings
echo 2. Transfer the APK file to your Android device
echo 3. Open the APK file and tap "Install"
echo 4. Launch "Assignment Tracker" from your app drawer
echo.
echo 🔧 Alternative Installation Methods:
echo - Use ADB: adb install assignment-tracker.apk
echo - Use Android Studio: File ^> Open ^> assignment-tracker.apk
echo - Use Google Play Console (for distribution)
pause

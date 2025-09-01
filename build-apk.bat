@echo off
echo Building Assignment Tracker APK...
echo.

REM Check if Cordova is installed
cordova --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Cordova is not installed. Installing Cordova...
    npm install -g cordova
)

REM Check if Android platform is added
if not exist "platforms\android" (
    echo Adding Android platform...
    cordova platform add android
)

REM Create icons directory if it doesn't exist
if not exist "icons" mkdir icons

REM Build the APK
echo Building APK...
cordova build android --release

REM Check if build was successful
if exist "platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk" (
    echo.
    echo ✅ APK built successfully!
    echo Location: platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk
    echo.
    echo To sign the APK for release:
    echo 1. Generate a keystore: keytool -genkey -v -keystore assignment-tracker.keystore -alias assignment-tracker -keyalg RSA -keysize 2048 -validity 10000
    echo 2. Sign the APK: jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore assignment-tracker.keystore app-release-unsigned.apk assignment-tracker
    echo 3. Optimize: zipalign -v 4 app-release-unsigned.apk assignment-tracker.apk
) else (
    echo ❌ Build failed. Check the error messages above.
)

pause

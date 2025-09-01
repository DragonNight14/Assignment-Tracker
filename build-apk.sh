#!/bin/bash

echo "Building Assignment Tracker APK..."
echo

# Check if Cordova is installed
if ! command -v cordova &> /dev/null; then
    echo "Cordova is not installed. Installing Cordova..."
    npm install -g cordova
fi

# Check if Android platform is added
if [ ! -d "platforms/android" ]; then
    echo "Adding Android platform..."
    cordova platform add android
fi

# Create icons directory if it doesn't exist
mkdir -p icons

# Build the APK
echo "Building APK..."
cordova build android --release

# Check if build was successful
if [ -f "platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
    echo
    echo "✅ APK built successfully!"
    echo "Location: platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk"
    echo
    echo "To sign the APK for release:"
    echo "1. Generate a keystore: keytool -genkey -v -keystore assignment-tracker.keystore -alias assignment-tracker -keyalg RSA -keysize 2048 -validity 10000"
    echo "2. Sign the APK: jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore assignment-tracker.keystore app-release-unsigned.apk assignment-tracker"
    echo "3. Optimize: zipalign -v 4 app-release-unsigned.apk assignment-tracker.apk"
else
    echo "❌ Build failed. Check the error messages above."
fi

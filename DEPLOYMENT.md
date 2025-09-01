# Assignment Tracker - Android APK Deployment Guide

## 📱 Building the APK

### Prerequisites
1. **Node.js** (v14 or higher)
2. **Apache Cordova** (`npm install -g cordova`)
3. **Android Studio** with Android SDK
4. **Java Development Kit (JDK)** 8 or higher

### Quick Build (Automated)
```bash
# Windows
build-apk.bat

# Linux/Mac
chmod +x build-apk.sh
./build-apk.sh

# Or using npm
npm run build:apk
```

### Manual Build Steps
```bash
# 1. Install Cordova globally
npm install -g cordova

# 2. Add Android platform
cordova platform add android

# 3. Build release APK
cordova build android --release
```

## 📦 APK Location
After successful build, find your APK at:
```
platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## 🔐 Signing the APK (For Play Store)

### 1. Generate Keystore
```bash
keytool -genkey -v -keystore assignment-tracker.keystore -alias assignment-tracker -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Sign the APK
```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore assignment-tracker.keystore app-release-unsigned.apk assignment-tracker
```

### 3. Optimize APK
```bash
zipalign -v 4 app-release-unsigned.apk assignment-tracker.apk
```

## 🚀 GitHub Release

### 1. Create Release
1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `Assignment Tracker v1.0.0`

### 2. Upload APK
- Drag and drop the signed `assignment-tracker.apk` file
- Add release notes describing features

### 3. Release Notes Template
```markdown
# Assignment Tracker v1.0.0

## 🎉 Features
- ✅ Track assignments from Canvas LMS and Google Classroom
- 📱 Mobile-first responsive design
- 🏷️ Tag system for organization
- 📅 Calendar view with due dates
- 🎨 Premium themes and customization
- 💳 Subscription tiers (Free, Premium, Pro)
- 🔄 Real-time sync capabilities
- 📊 Assignment progress tracking

## 📱 Installation
1. Download the APK file below
2. Enable "Install from Unknown Sources" in Android settings
3. Install the APK
4. Open Assignment Tracker and start organizing!

## 🔧 System Requirements
- Android 5.1+ (API level 22)
- 50MB storage space
- Internet connection for API sync

## 🆕 What's New
- Initial release with full feature set
- PWA support for web browsers
- Complete Canvas and Google Classroom integration
```

## 🔧 Troubleshooting

### Build Errors
- **Gradle build failed**: Update Android SDK and build tools
- **Java version issues**: Use JDK 8 or 11
- **Missing Android platform**: Run `cordova platform add android`

### Runtime Issues
- **App crashes on startup**: Check device compatibility (Android 5.1+)
- **API sync fails**: Verify internet connection and API credentials
- **Storage issues**: Clear app data and restart

## 📋 App Configuration

### Environment Variables
Create `.env` file with:
```
PORT=3000
JWT_SECRET=your-secret-key
CANVAS_API_URL=https://your-school.instructure.com
GOOGLE_API_KEY=your-google-api-key
```

### Features by Tier
- **Free**: 10 assignments, 2 courses, daily sync
- **Premium**: Unlimited assignments, real-time sync, custom themes
- **Pro**: Everything + team collaboration, analytics, cloud backup

## 📞 Support
- GitHub Issues: Report bugs and feature requests
- Documentation: Check README.md for setup instructions
- API Integration: See API documentation for Canvas/Google setup

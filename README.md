# Assignment Tracker - Android PWA

A Progressive Web App (PWA) for tracking academic assignments with Canvas and Google Classroom integration, now optimized for Android deployment.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Modern web browser (Chrome recommended)

### Installation
1. Clone or download this project
2. Open a terminal in the project directory
3. Run: `npm install`
4. Run: `npm start`
5. Open http://localhost:8080 in your browser

## 📱 Android Conversion

### Method 1: Automated Debug & Build (Recommended)
```bash
npm run debug
```
This will:
- Check all system requirements
- Validate project files
- Generate missing icons
- Test PWA functionality
- Guide you through APK building

### Method 2: Manual Steps

#### Step 1: Generate Icons
```bash
npm run generate-icons
```
Or open `create-icons.html` in your browser and download the icons.

#### Step 2: Test PWA
```bash
npm run pwa-test
```

#### Step 3: Build APK

**Option A: Local Build (requires Android SDK)**
```bash
npm run build-apk
```

**Option B: PWA Builder Cloud Service**
1. Visit https://www.pwabuilder.com/android
2. Enter your app URL: `http://localhost:8080`
3. Follow the instructions to download your APK

## 🔧 Debugging

### Common Issues & Solutions

#### Missing Icons
- **Problem**: `icon-192x192.png` or `icon-512x512.png` not found
- **Solution**: Run `npm run generate-icons` or open `create-icons.html`

#### Service Worker Not Registering
- **Problem**: App doesn't work offline
- **Solution**: Check browser console for errors, ensure HTTPS or localhost

#### Manifest Issues
- **Problem**: "Add to Home Screen" not working
- **Solution**: Validate manifest.json using the debug script

#### Android SDK Issues
- **Problem**: Cannot build APK locally
- **Solution**: Use PWA Builder cloud service instead

### Debug Checklist
- [ ] All icon files present (192x192, 512x512)
- [ ] manifest.json is valid JSON
- [ ] Service worker registered successfully
- [ ] PWA installable in browser
- [ ] Offline functionality works
- [ ] All features tested on mobile

## 📋 Project Structure

```
assignment-tracker/
├── index.html              # Main app interface
├── create-assignment.html  # Assignment creation form
├── login.html             # Login page
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── styles.css             # Main styles
├── script.js              # Main JavaScript
├── create-icons.html      # Icon generator
├── build-apk.bat          # Windows APK builder
├── debug-and-build.bat    # Debug and build script
├── android-config.json    # Android-specific config
└── package.json           # Project dependencies
```

## 🎨 Customization

### Colors
Update the theme colors in:
- `manifest.json` (theme_color, background_color)
- `styles.css` (CSS variables)
- `android-config.json` (splash screen colors)

### App Information
Update in `manifest.json`:
- `name`: Full app name
- `short_name`: Short name for home screen
- `description`: App description

### Android Configuration
Edit `android-config.json` for:
- Package ID
- App version
- Permissions
- Build settings

## 📱 Android Features

### Optimizations
- **Offline Support**: Full offline functionality
- **Push Notifications**: Assignment reminders
- **App Shortcuts**: Quick access to common actions
- **Splash Screen**: Custom loading screen
- **Background Sync**: Data synchronization

### Permissions
- Internet access
- Network state
- Vibration (for notifications)
- Wake lock (for background sync)

## 🚀 Deployment

### Testing
1. Install on Android device
2. Test all features
3. Verify offline functionality
4. Check notifications
5. Test app shortcuts

### Distribution
- **Personal Use**: Direct APK installation
- **Internal Testing**: Google Play Console internal testing
- **Public Release**: Google Play Store submission

## 🔍 Troubleshooting

### Build Issues
```bash
# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

### PWA Issues
```bash
# Check service worker
# Open DevTools > Application > Service Workers

# Check manifest
# Open DevTools > Application > Manifest

# Test offline
# Open DevTools > Network > Offline
```

### Android Issues
- Ensure "Unknown Sources" is enabled
- Check device compatibility (Android 5.0+)
- Verify APK signature
- Test on multiple devices

## 📞 Support

For issues and questions:
1. Run the debug script: `npm run debug`
2. Check the troubleshooting section
3. Review browser console for errors
4. Test on different devices/browsers

## 📄 License

MIT License - see LICENSE file for details

---

**Note**: This PWA is optimized for Android deployment using modern web standards and PWA best practices. The automated debug script will help identify and resolve common issues during the conversion process.

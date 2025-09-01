# Assignment Tracker

A modern mobile-first assignment tracking app with Canvas LMS and Google Classroom integration.

## Features

- **Smart Assignment Categorization**: Automatically sorts assignments into High Priority (4 days), Coming Up (1-2 weeks), and Worry About Later (3+ weeks)
- **Real API Integration**: Syncs with Canvas LMS and Google Classroom for your Physics, Band, English, and Math classes
- **Custom Assignment Creation**: Add your own assignments with tags and descriptions
- **Calendar View**: Visual calendar showing all assignments with interactive tooltips
- **Dark Mode**: Toggle between light and dark themes
- **Customizable Appearance**: Color themes, custom backgrounds, and transparent glass effects
- **Mobile PWA**: Install as a mobile app with offline functionality

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
CANVAS_API_URL=https://yourschool.instructure.com
CANVAS_API_TOKEN=your-canvas-api-token
GOOGLE_API_KEY=your-google-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

3. Start the server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

## API Configuration

### Canvas LMS
1. Go to your Canvas account settings
2. Generate a new access token
3. Copy your Canvas URL (e.g., https://yourschool.instructure.com)
4. Enter these in the app's Settings > API Integration

### Google Classroom
1. Enable Google Classroom API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Get your API key and access token
4. Enter these in the app's Settings > API Integration

## File Structure

```
assignment-tracker/
├── index.html          # Main app interface
├── styles.css          # Modern mobile-first styling
├── app.js             # Frontend application logic
├── api.js             # API client for backend communication
├── server.js          # Express backend server
├── database.js        # SQLite database utilities
├── manifest.json      # PWA manifest
├── sw.js             # Service worker for offline functionality
├── package.json      # Node.js dependencies
├── .env              # Environment configuration
└── README.md         # This file
```

## Usage

1. **Login**: Choose Canvas LMS, Google Classroom, or Guest mode
2. **View Assignments**: See your assignments categorized by urgency
3. **Create Assignments**: Use the + button to add custom assignments with tags
4. **Mark Complete**: Tap checkboxes to mark assignments as done
5. **Calendar View**: See all assignments in calendar format
6. **Customize**: Change themes, colors, and backgrounds in Settings

## Technologies

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **APIs**: Canvas LMS API, Google Classroom API
- **PWA**: Service Worker, Web App Manifest

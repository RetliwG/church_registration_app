# Progressive Web App (PWA) Setup Guide

## Overview
This church registration app is built as a Progressive Web App (PWA), which means:
- ✅ **Native-like experience** on iPads and other devices
- ✅ **Offline functionality** with automatic sync when online
- ✅ **Installable** on device home screen
- ✅ **Secure authentication** with Google OAuth
- ✅ **Private data storage** using Google Sheets
- ✅ **No ongoing costs** - free hosting with GitHub Pages

## Quick Start

### 1. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen if needed
6. For "Application type", select "Web application"
7. Add your GitHub Pages URL to "Authorized JavaScript origins":
   - `https://yourusername.github.io`
8. Copy the Client ID (starts with numbers, ends with `.apps.googleusercontent.com`)

### 2. Google Sheets Setup
1. Create a new Google Spreadsheet
2. Copy the Spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
3. Share the spreadsheet with yourself (or keep private - OAuth will handle access)
4. The app will automatically create the required sheets and headers

### 3. Deploy to GitHub Pages
1. Fork or clone this repository
2. Go to your repository Settings → Pages
3. Select "Deploy from a branch" → "main" → "/ (root)"
4. Your app will be available at: `https://yourusername.github.io/church_registration_app/`

### 4. Configure the App
1. Open your deployed app URL
2. Click "Complete Setup" when prompted
3. Enter your Google OAuth Client ID
4. Enter your Google Spreadsheet ID
5. Test the connection
6. Save configuration

## Installation on iPad

### Option 1: Safari Installation
1. Open the app in Safari on your iPad
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize the name if desired
5. Tap "Add"

### Option 2: Chrome Installation
1. Open the app in Chrome on your iPad
2. Tap the three-dot menu
3. Select "Add to Home Screen"
4. Follow the prompts

## Features

### Authentication & Security
- **Google OAuth 2.0**: Secure sign-in with Google accounts
- **Private data access**: Only authenticated users can access the spreadsheet
- **Token management**: Automatic token refresh and secure storage
- **No exposed API keys**: Client-side OAuth eliminates API key security concerns

### Offline Functionality
- **Local storage**: Data cached locally using IndexedDB
- **Background sync**: Automatic sync when internet connection is restored
- **Offline operations**: Can register children and record attendance without internet
- **Sync indicators**: Visual feedback showing online/offline status

### Registration System
- **Parent registration**: Complete contact information
- **Child management**: Multiple children per parent
- **Media consent**: Digital consent tracking
- **Age calculation**: Automatic age calculation from birth date

### Sign-in/Sign-out System
- **Quick search**: Find children by name
- **Bulk operations**: Sign in/out multiple children at once
- **Time tracking**: Accurate timestamp recording
- **Current attendance**: Real-time view of who's currently signed in

## App Management

### Data Privacy
- All data is stored in your private Google Spreadsheet
- Only users you authorize can access the data
- No data is stored on public servers
- HTTPS encryption for all communications

### Backup & Export
- Data is automatically backed up in Google Sheets
- Can export to Excel/CSV from Google Sheets
- Revision history available in Google Sheets
- Multiple admin access possible through Google Sheets sharing

### Updates
- App automatically checks for updates
- Service worker handles app caching
- Refresh the browser to get latest version
- Configuration persists across updates

## Troubleshooting

### Authentication Issues
- **"Sign-in failed"**: Check OAuth Client ID configuration
- **"Unauthorized"**: Verify the domain is added to OAuth origins
- **"Access denied"**: Ensure Google Sheets API is enabled

### Data Sync Issues
- **"Sync failed"**: Check internet connection and OAuth token
- **"Spreadsheet not found"**: Verify Spreadsheet ID is correct
- **Permission denied"**: Ensure the user has access to the spreadsheet

### Installation Issues
- **App not installable**: Check that all PWA requirements are met
- **Icons missing**: Ensure icon files are properly uploaded
- **Offline not working**: Verify service worker is registered

### Performance Optimization
- **Slow loading**: Enable browser caching and check internet speed
- **Memory issues**: Limit the number of open browser tabs
- **Sync delays**: Large amounts of data may take time to sync

## Advanced Configuration

### Custom Domain (Optional)
1. Purchase a custom domain
2. Configure DNS to point to GitHub Pages
3. Update OAuth origins with new domain
4. Update any hardcoded URLs in the app

### Multiple Environments
- Use different OAuth Client IDs for development/production
- Separate spreadsheets for testing and live data
- Branch-based deployments for testing features

### Analytics (Optional)
- Add Google Analytics code to track usage
- Monitor performance with Lighthouse
- Set up error tracking with services like Sentry

## Support & Maintenance

### Regular Maintenance
- Review and clean up old attendance data periodically
- Update OAuth credentials if needed
- Monitor app performance and user feedback
- Keep PWA manifest and service worker updated

### User Training
- Provide initial training on app installation
- Document common workflows for users
- Create quick reference guides for volunteers
- Set up support contacts for technical issues

This PWA approach provides a professional, secure, and cost-effective solution for church youth registration that works seamlessly on iPads while maintaining data privacy and security.

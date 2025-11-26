# Church Youth Registration PWA

A Progressive Web App for managing church youth registration and attendance tracking with offline capabilities and secure Google Sheets integration.

## 📊 Application Workflow

![Application Workflow](workflow-diagram.mermaid)

View the complete application flow diagram: [workflow-diagram.mermaid](workflow-diagram.mermaid)

## 🌟 Features

- **📱 Installable App**: Works like a native app on iPad - install from home screen
- **🔄 Offline/Online Sync**: Register and track attendance even without internet
- **👥 Parent & Child Registration**: Register parent details and multiple children in one form
- **✅ Sign In/Out Management**: Quick search and selection for signing children in and out
- **📊 Real-time Attendance Tracking**: View all currently signed-in children
- **✏️ Edit Existing Records**: Click "Edit" on any signed-in child to update their information
- **🏢 Multi-Ministry Support**: Manage multiple ministries with separate spreadsheets
- **🎨 iPad Optimized**: Responsive design that works perfectly on tablets
- **☁️ Google Sheets Integration**: All data synced to private Google Sheets
- **🔐 Secure Authentication**: Google OAuth login to protect sensitive data
- **💾 Smart Caching**: Works offline, syncs when back online

## 💻 Technology Stack

- **Frontend**: Progressive Web App (PWA) with HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: Google OAuth 2.0 for secure access
- **Data Storage**: Private Google Sheets with service account access
- **Offline Storage**: IndexedDB for local caching and offline functionality
- **Hosting**: GitHub Pages with secure credential management
- **Cost**: Completely free to run (no server costs)

## 🚀 Quick Start

1. **Set up Private Google Sheets** with OAuth authentication (see `SETUP_GUIDE.md`)
2. **Deploy to GitHub Pages** (instructions below) 
3. **Install PWA on iPad** - visit your site and "Add to Home Screen"
4. **Login with Google** to access your private church data
5. **Works offline** - register families and track attendance even without internet!

**🔒 Privacy**: Your data stays private in your Google account, accessible only to authorized users.

## Setup Instructions

### 1. Create Google Sheets

#### For Multi-Ministry Setup:

Each ministry needs its own Google Sheet with three tabs. **Currently, you must manually create these tabs:**

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet for each ministry (e.g., "Youth Ministry Data", "Children's Church Data")
3. In each spreadsheet, create three sheets (tabs) with these **exact names**:
   - `Parents` (case-sensitive)
   - `Children` (case-sensitive)
   - `SignInOut` (case-sensitive, no spaces)
4. Leave the sheets empty - the app will automatically add headers on first use
5. Share each spreadsheet with Editor access to the Google account(s) that will use the app

**📝 Note**: The app will auto-populate headers but cannot create tabs. Future improvement: implement automatic tab creation via Google Sheets API.

#### For Single Ministry (Legacy):

1. Create one spreadsheet as described above
2. Configure directly in the app settings

### 2. Set up Google OAuth & Sheets API

**🔐 Secure Setup with Private Spreadsheet**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"
4. **Set up OAuth 2.0 (for user authentication)**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `https://retliwg.github.io`
   - Add authorized redirect URIs:
     - `https://retliwg.github.io/church_registration_app/`
   - Click "Create" and copy the Client ID
5. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace)
   - Fill in app name: "Church Youth Registration"
   - Add your email as developer contact
   - Add scopes: "Google Sheets API" read/write access
6. **Keep your spreadsheet private**:
   - Your Google Sheet stays private
   - Only users you authorize can access it
   - No need to make it public!

### 3. Configure the PWA

**🔒 Secure OAuth Configuration**

1. **Deploy your app first** (step 4 below)
2. **Visit the configuration page**: `https://retliwg.github.io/church_registration_app/config-setup.html`
3. **Enter your OAuth Client ID and Spreadsheet ID**
4. **Test the authentication** - you'll be prompted to login with Google
5. **Authorize the app** to access your private Google Sheets

**Why this is secure:**
- ✅ **Private spreadsheet** - only authorized users can access
- ✅ **OAuth authentication** - users login with their Google accounts
- ✅ **No API keys in code** - uses secure OAuth flow
- ✅ **Granular permissions** - only access to specified spreadsheet

### 4. Deploy with GitHub Pages

Since you're already working with this GitHub repository, deploying with GitHub Pages is the easiest option:

1. **Enable GitHub Pages**:
   - Go to your repository on GitHub.com
   - Click on "Settings" tab
   - Scroll down to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

2. **Access your app**:
   - GitHub will provide a URL like: `https://retliwg.github.io/church_registration_app`
   - It may take a few minutes for the site to be available
   - You'll see a green checkmark when it's ready

3. **Install the PWA on your iPad**:
   - Visit your app URL in Safari
   - Tap Share → "Add to Home Screen"
   - The app will install like a native app!

4. **Login and start using**:
   - Open the installed app
   - Login with your Google account
   - Start registering families and tracking attendance
   - Works offline automatically!

#### Alternative Options:

**Local Testing** (for development):
- If you have Python: `python -m http.server 8000`
- If you have Node.js: `npx serve .`
- Open your browser to `http://localhost:8000`

**Other Hosting Services**:
- [Netlify](https://netlify.com) - Drag and drop your project folder
- [Vercel](https://vercel.com) - Connect your GitHub repository

## Data Structure

### Parents Sheet
| Column | Field | Description |
|--------|-------|-------------|
| A | Parent Name | Full name of the parent/guardian |
| B | Phone 1 | Primary phone number |
| C | Phone 2 | Secondary phone number (optional) |
| D | Email | Email address |
| E | Address | Full address |
| F | Registration Date | Automatically filled |

### Children Sheet
| Column | Field | Description |
|--------|-------|-------------|
| A | Parent ID | Reference to parent row |
| B | First Name | Child's first name |
| C | Last Name | Child's last name |
| D | Gender | Male/Female |
| E | Media Consent | Yes/No for photo permissions |
| F | Other Info | Additional notes |
| G | Registration Date | Automatically filled |
| H | Date of Birth | Child's birth date |
| I | Age | Automatically calculated |

### SignInOut Sheet
| Column | Field | Description |
|--------|-------|-------------|
| A | Sign In Timestamp | When child was signed in |
| B | Sign Out Timestamp | When child was signed out |
| C | Child ID | Reference to child row |
| D | Parent ID | Reference to parent row |
| E | Child Full Name | Display name |
| F | Date | Date of attendance |

## Usage

### Registration
1. Navigate to the "Registration" tab
2. Fill in parent information
3. Add children by clicking "Add Child"
4. Fill in each child's details
5. Click "Save Registration"

### Sign In/Out
1. Navigate to the "Sign In/Out" tab
2. Start typing a child's name in the search box
3. Select children from the suggestions
4. Click "Sign In Selected" or "Sign Out Selected"

### Attendance Tracking
1. Navigate to the "Current Attendance" tab
2. View all children currently signed in
3. Use the "Sign Out" button next to each child if needed
4. Click "Refresh" to update the view

## 🧪 Testing Checklist

Use this comprehensive checklist to verify all app functionality after setup:

### Initial Setup & Configuration
- [ ] **Configuration Page Access**: Click ⚙️ settings button in header
- [ ] **OAuth Client ID**: Enter Google OAuth Client ID and save successfully
- [ ] **Spreadsheet ID**: Enter Google Sheets spreadsheet ID and save successfully
- [ ] **Authentication Test**: Click "Test Authentication" and verify Google login works
- [ ] **Redirect to Main App**: Click "Go to Main Application" and verify it loads the updated app

### Authentication & Security
- [ ] **Google Login**: Successfully sign in with Google account
- [ ] **Token Persistence**: Refresh page and verify still signed in (no re-login required)
- [ ] **User Info Display**: Verify user name appears in header after login
- [ ] **Sign Out**: Click "Sign Out" button and verify successful logout
- [ ] **Protected Access**: Verify app requires login when signed out

### Parent Registration
- [ ] **Parent Form**: Fill out all parent fields (Name, Phone 1, Phone 2, Email, Address)
- [ ] **Required Validation**: Leave required fields empty and verify validation errors
- [ ] **Data Persistence**: Complete parent registration and verify data saves
- [ ] **Google Sheets Integration**: Check your Google Sheets "Parents" tab for new row
- [ ] **Clear Form**: Verify form clears after successful submission

### Child Registration
- [ ] **Add Child Button**: Click "Add Child" and verify new child form appears
- [ ] **Multiple Children**: Add 2-3 children to test multiple child handling
- [ ] **Child Form Fields**: Fill out First Name, Last Name, Date of Birth, Gender, Media Consent, Other Info
- [ ] **Age Calculation**: Verify age is calculated automatically from date of birth
- [ ] **Remove Child**: Use "Remove" button to delete a child form
- [ ] **Child Data Saving**: Submit registration and verify children appear in "Children" sheet
- [ ] **Parent-Child Linking**: Verify children are properly linked to parent in spreadsheet

### Sign In/Out Functionality
- [ ] **Search Functionality**: Navigate to "Sign In/Out" tab and test child name search
- [ ] **Live Search**: Verify search suggestions appear as you type
- [ ] **Child Selection**: Select one or more children from search results
- [ ] **Sign In Process**: Click "Sign In Selected" and verify success message
- [ ] **Sign Out Process**: Select signed-in children and click "Sign Out Selected"
- [ ] **Data Recording**: Check "SignInOut" sheet for new attendance records
- [ ] **Timestamp Accuracy**: Verify sign-in/out timestamps are correct

### Attendance Tracking
- [ ] **Current Attendance View**: Navigate to "Current Attendance" tab
- [ ] **Real-time Updates**: Verify signed-in children appear in the list
- [ ] **Child Information**: Check that parent contact info is displayed
- [ ] **Individual Sign Out**: Use "Sign Out" button next to specific children
- [ ] **Refresh Functionality**: Click "Refresh" and verify data updates
- [ ] **Empty State**: When no children are signed in, verify appropriate message displays

### Progressive Web App (PWA) Features
- [ ] **Installation Prompt**: On iPad Safari, verify "Add to Home Screen" option available
- [ ] **App Installation**: Install app to home screen and verify it opens independently
- [ ] **App Icon**: Verify correct icon appears on home screen
- [ ] **Standalone Mode**: Confirm installed app opens without browser UI
- [ ] **App Updates**: Make a change, deploy, and verify app updates

### Offline Functionality
- [ ] **Network Detection**: Verify network status indicator appears
- [ ] **Offline Registration**: Disconnect internet, register family, verify data saves locally
- [ ] **Offline Sign In/Out**: Test attendance tracking without internet connection
- [ ] **Sync on Reconnect**: Reconnect internet and verify offline data syncs to Google Sheets
- [ ] **Background Sync**: Verify data syncs automatically when connection restored

### User Interface & Experience
- [ ] **Responsive Design**: Test on different screen sizes (especially iPad)
- [ ] **Navigation**: Test all navigation buttons and section switching
- [ ] **Form Validation**: Test all form validation messages and error states
- [ ] **Loading States**: Verify loading indicators appear during operations
- [ ] **Success Messages**: Confirm appropriate success messages display
- [ ] **Error Handling**: Test error scenarios and verify user-friendly error messages

### Data Accuracy & Integrity
- [ ] **Parent Data**: Verify all parent information appears correctly in Google Sheets
- [ ] **Child Data**: Confirm all child details are accurately recorded
- [ ] **Timestamps**: Check that all timestamps are in correct timezone
- [ ] **Data Relationships**: Verify parent-child relationships are maintained
- [ ] **No Duplicate Entries**: Confirm no duplicate records are created
- [ ] **Special Characters**: Test names with apostrophes, hyphens, and international characters

### Performance & Reliability
- [ ] **Load Time**: Verify app loads quickly (under 3 seconds)
- [ ] **Large Datasets**: Test with 20+ families to verify performance
- [ ] **Memory Usage**: Monitor for memory leaks during extended use
- [ ] **Cache Performance**: Test app performance after cache clearing
- [ ] **Concurrent Usage**: Test multiple users accessing simultaneously

### Security Testing
- [ ] **HTTPS Access**: Verify site loads over HTTPS (check for lock icon)
- [ ] **Token Security**: Verify OAuth tokens are not exposed in URLs
- [ ] **API Key Protection**: Confirm API calls work without exposing credentials
- [ ] **Data Privacy**: Test that only authorized users can access data
- [ ] **Session Management**: Verify sessions expire appropriately

### Browser Compatibility
- [ ] **Safari on iPad**: Full functionality testing on primary target device
- [ ] **Safari on iPhone**: Mobile responsiveness and functionality
- [ ] **Chrome Desktop**: Complete feature testing
- [ ] **Chrome Mobile**: Mobile-specific testing
- [ ] **Firefox**: Cross-browser compatibility verification

### Error Recovery
- [ ] **Network Interruption**: Test what happens when internet cuts out mid-operation
- [ ] **Invalid Data**: Test form submission with invalid data formats
- [ ] **API Failures**: Test behavior when Google Sheets API is temporarily unavailable
- [ ] **Cache Corruption**: Clear all caches and verify app recovers gracefully
- [ ] **Configuration Reset**: Test reconfiguration process if settings are lost

### Final Verification
- [ ] **End-to-End Workflow**: Complete full registration → sign-in → attendance tracking workflow
- [ ] **Data Verification**: Cross-check all data in Google Sheets matches app displays
- [ ] **User Experience**: Have someone unfamiliar test the app for usability
- [ ] **Production Readiness**: Verify app is ready for actual church use
- [ ] **Backup Plan**: Document rollback procedure if issues arise

### Notes Section
```
Test Date: ___________
Tested By: ___________
Issues Found: 
_________________________
_________________________
_________________________

Actions Needed:
_________________________
_________________________
_________________________
```

## Browser Support

- Safari (iOS/macOS)
- Chrome
- Firefox
- Edge

## Troubleshooting

### "Error initializing application"
- Check that your API key is correct in `config.js`
- Verify that the Google Sheets API is enabled
- Ensure your spreadsheet is publicly accessible
- **Check API key restrictions**: Make sure your website URL is allowed in the API key restrictions

### "Error saving/loading data"
- Confirm your spreadsheet ID is correct
- Check that the sheet names match exactly: "Parents", "Children", "SignInOut"
- Verify your internet connection

### App not loading on iPad
- Ensure you're using HTTPS (GitHub Pages automatically provides this)
- Clear your browser cache and reload
- Try refreshing the page
- Check that your Google Sheets configuration is correct

### GitHub Pages not updating
- Changes can take a few minutes to appear
- Check the "Actions" tab in your GitHub repository for deployment status
- Make sure you pushed your latest changes to the main branch

## Security Notes

- **Data Privacy Options**: 
  - **Public Spreadsheet**: Anyone with the link can view your data (but cannot edit without API key)
  - **Private Spreadsheet**: Requires a backend server - more complex but completely private
- **Client-Side Limitations**: This app runs in the browser, so some credentials are visible to users
- **API Key Security**: Restricted to your specific website and Google Sheets API only
- **Recommendation**: Start with public spreadsheet approach, migrate to backend solution if privacy is critical
- **HTTPS Required**: GitHub Pages automatically provides HTTPS, which is required for secure API calls

### Privacy Considerations

If your church registration data is sensitive, consider:
1. Using a dedicated spreadsheet just for this app (no existing sensitive data)
2. Implementing the backend server approach for complete privacy
3. Using the app only on trusted devices/networks
4. Regularly reviewing who has access to the spreadsheet

## Customization

You can easily customize the application by:
- Modifying the CSS in `styles.css` for different colors/fonts
- Adding new fields to the registration forms
- Changing the validation rules in `app.js`
- Adding new features like reporting or data export

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your Google Sheets setup (especially that tabs are named exactly: Parents, Children, SignInOut)
3. Ensure you have Editor access to all ministry spreadsheets
4. Test with a simple registration first

## Future Improvements

### Automatic Tab Creation
**Current Limitation**: When adding a new ministry, you must manually create the three tabs (Parents, Children, SignInOut) in each ministry's Google Sheet.

**Planned Enhancement**: Implement automatic tab creation using the Google Sheets API `spreadsheets.batchUpdate` method with `addSheet` requests. This would allow the app to:
- Detect missing tabs when a ministry is added
- Automatically create required tabs with proper names
- Set up headers in one operation
- Eliminate manual sheet setup

**Implementation Notes**:
- Use `spreadsheets.get` to check existing tabs
- Use `spreadsheets.batchUpdate` with `AddSheetRequest` to create missing tabs
- Requires updating OAuth scope to include `spreadsheets` (not just `spreadsheets.values`)
- Reference: [Google Sheets API - Method: spreadsheets.batchUpdate](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate)

### Master Config Sheet Integration
**Current**: Ministries are added manually through the "Manage Ministries" UI and stored in localStorage.

**Planned Enhancement**: Read ministry list from a master Google Sheet, enabling:
- Centralized ministry management across multiple devices
- Automatic ministry synchronization
- Shared configuration across church staff
- Single source of truth for ministry spreadsheets


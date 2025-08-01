# Church Youth Registration PWA

A Progressive Web App for managing church youth registration and attendance tracking with offline capabilities and secure Google Sheets integration.

## 🌟 Features

- **📱 Installable App**: Works like a native app on iPad - install from home screen
- **🔄 Offline/Online Sync**: Register and track attendance even without internet
- **👥 Parent & Child Registration**: Register parent details and multiple children in one form
- **✅ Sign In/Out Management**: Quick search and selection for signing children in and out
- **📊 Real-time Attendance Tracking**: View all currently signed-in children
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

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Rename it to "Church Youth Registration"
4. Create three sheets (tabs) with these exact names:
   - `Parents`
   - `Children`
   - `SignInOut`

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
2. Verify your Google Sheets setup
3. Ensure all files are uploaded correctly
4. Test with a simple registration first

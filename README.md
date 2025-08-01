# Church Youth Registration App

A simple web application for managing church youth registration and attendance tracking using Google Sheets as the backend.

## Features

- **Parent & Child Registration**: Register parent details and multiple children in one form
- **Sign In/Out Management**: Quick search and selection for signing children in and out
- **Real-time Attendance Tracking**: View all currently signed-in children
- **iPad Optimized**: Responsive design that works great on tablets
- **Google Sheets Integration**: All data stored in Google Sheets (free and accessible)
- **No Login Required**: Simple, direct access to the application

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Google Sheets API
- **Hosting**: Can be hosted on any static web server (GitHub Pages, Netlify, etc.)
- **Cost**: Completely free to run

## Quick Start

1. **Set up Google Sheets** (see detailed guide in `SETUP_GUIDE.md`)
2. **Configure your app** by updating `config.js` with your API key and Spreadsheet ID
3. **Deploy to GitHub Pages** (instructions below)
4. **Test on your iPad** - your app will be live at `https://retliwg.github.io/church_registration_app`

## Setup Instructions

### 1. Create Google Sheets

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Rename it to "Church Youth Registration"
4. Create three sheets (tabs) with these exact names:
   - `Parents`
   - `Children`
   - `SignInOut`

### 2. Set up Google Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. Make your spreadsheet public:
   - Open your Google Sheet
   - Click "Share" in the top right
   - Change access to "Anyone with the link can view"
   - Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)

### 3. Configure the Application

1. Open `config.js` in your text editor
2. Replace the placeholder values:
   ```javascript
   const CONFIG = {
       GOOGLE_SHEETS_API_KEY: 'your-actual-api-key-here',
       SPREADSHEET_ID: 'your-spreadsheet-id-here',
       // ... rest of the config
   };
   ```

### 4. Deploy with GitHub Pages

Since you're already working with this GitHub repository, deploying with GitHub Pages is the easiest option:

1. **Push your code to GitHub** (if you haven't already):
   ```bash
   git add .
   git commit -m "Initial church registration app"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.com
   - Click on "Settings" tab
   - Scroll down to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

3. **Access your app**:
   - GitHub will provide a URL like: `https://retliwg.github.io/church_registration_app`
   - It may take a few minutes for the site to be available
   - You'll see a green checkmark when it's ready

4. **Update config.js with your credentials**:
   - Your app is now live, but you need to add your Google Sheets API key and Spreadsheet ID
   - Edit `config.js` directly on GitHub or locally and push the changes

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

- The API key used is a public key with read/write access to your specific spreadsheet
- No sensitive authentication data is stored in the application
- All data is stored in your Google Sheets, which you control

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

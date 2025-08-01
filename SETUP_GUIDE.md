# Google Sheets Setup Guide

This guide will walk you through setting up Google Sheets as the backend for your Church Youth Registration app.

## Step 1: Create the Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click the "+" button to create a new spreadsheet
3. Rename the spreadsheet to "Church Youth Registration"
4. You should see one sheet tab at the bottom called "Sheet1"

## Step 2: Create the Required Sheets

You need to create three separate sheets (tabs) in your spreadsheet:

### Creating the Parents Sheet
1. Right-click on "Sheet1" tab at the bottom
2. Select "Rename" and change it to "Parents"
3. In row 1, add these headers:
   - A1: Parent Name
   - B1: Phone 1
   - C1: Phone 2
   - D1: Email
   - E1: Address
   - F1: Registration Date

### Creating the Children Sheet
1. Right-click in the sheet tab area and select "Insert sheet"
2. Name it "Children"
3. In row 1, add these headers:
   - A1: Parent ID
   - B1: First Name
   - C1: Last Name
   - D1: Gender
   - E1: Media Consent
   - F1: Other Info
   - G1: Registration Date
   - H1: Date of Birth
   - I1: Age

### Creating the SignInOut Sheet
1. Right-click in the sheet tab area and select "Insert sheet"
2. Name it "SignInOut"
3. In row 1, add these headers:
   - A1: Sign In Timestamp
   - B1: Sign Out Timestamp
   - C1: Child ID
   - D1: Parent ID
   - E1: Child Full Name
   - F1: Date

## Step 3: Make the Spreadsheet Public

1. Click the "Share" button in the top right corner
2. Click "Change to anyone with the link"
3. Make sure it's set to "Viewer" (the app will use API to write)
4. Click "Copy link"
5. From the link, extract the Spreadsheet ID (the long string between `/d/` and `/edit`)
   - Example: If your link is `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - Your Spreadsheet ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## Step 4: Set Up Google Cloud Console

### Create a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown (next to "Google Cloud Platform")
3. Click "New Project"
4. Give it a name like "Church Registration App"
5. Click "Create"

### Enable Google Sheets API
1. In the Google Cloud Console, make sure your new project is selected
2. Go to "APIs & Services" > "Library"
3. Search for "Google Sheets API"
4. Click on "Google Sheets API"
5. Click "Enable"

### Create API Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key that's generated
4. Click "Restrict Key" for security
5. Under "API restrictions", select "Restrict key"
6. Choose "Google Sheets API" from the dropdown
7. Under "Website restrictions", you can add your website domain if you know it
8. Click "Save"

## Step 5: Configure Your App

1. Open the `config.js` file in your app
2. Replace the placeholder values:

```javascript
const CONFIG = {
    GOOGLE_SHEETS_API_KEY: 'your-api-key-here',
    SPREADSHEET_ID: 'your-spreadsheet-id-here',
    // ... rest stays the same
};
```

## Step 6: Test Your Setup

1. Open your app in a web browser
2. Try registering a test parent and child
3. Check your Google Sheet to see if the data appears
4. Try signing the child in and out
5. Verify the attendance tracking works

## Troubleshooting

### API Key Issues
- Make sure the API key is correctly copied
- Verify that Google Sheets API is enabled for your project
- Check that any restrictions on the API key are correct

### Spreadsheet Access Issues
- Ensure the spreadsheet is set to "Anyone with the link can view"
- Double-check that the Spreadsheet ID is correct
- Make sure the sheet names are exactly: "Parents", "Children", "SignInOut"

### Headers Not Found
- Verify that each sheet has the correct headers in row 1
- Make sure there are no extra spaces in the header names
- Check that the headers are in the correct columns

## Security Considerations

- The API key allows read/write access to your spreadsheet
- Keep your API key secure and don't share it publicly
- Consider adding website restrictions to your API key
- The spreadsheet needs to be publicly viewable, but only you have edit access through the API

## Data Privacy

- All data is stored in your Google account
- You have full control over the data
- You can download or delete the data at any time
- Google's privacy policies apply to the stored data

This setup provides a free, reliable backend for your church registration app with no ongoing costs!

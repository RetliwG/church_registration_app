// Configuration for Google Sheets API
const CONFIG = {
    // Replace these with your actual values after setting up Google Sheets API
    GOOGLE_SHEETS_API_KEY: 'YOUR_GOOGLE_SHEETS_API_KEY',
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
    
    // Sheet names (tabs in your Google Spreadsheet)
    SHEETS: {
        PARENTS: 'Parents',
        CHILDREN: 'Children', 
        SIGNIN: 'SignInOut'
    },
    
    // Discovery document for Google Sheets API
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    
    // Scope for Google Sheets API
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

// Column mappings for each sheet
const COLUMNS = {
    PARENTS: {
        NAME: 'A',
        PHONE1: 'B', 
        PHONE2: 'C',
        EMAIL: 'D',
        ADDRESS: 'E',
        REGISTRATION_DATE: 'F'
    },
    CHILDREN: {
        PARENT_ID: 'A',
        FIRST_NAME: 'B',
        LAST_NAME: 'C', 
        GENDER: 'D',
        MEDIA_CONSENT: 'E',
        OTHER_INFO: 'F',
        REGISTRATION_DATE: 'G',
        DATE_OF_BIRTH: 'H',
        AGE: 'I'
    },
    SIGNIN: {
        SIGNIN_TIMESTAMP: 'A',
        SIGNOUT_TIMESTAMP: 'B',
        CHILD_ID: 'C',
        PARENT_ID: 'D',
        CHILD_FULL_NAME: 'E',
        DATE: 'F'
    }
};

export { CONFIG, COLUMNS };

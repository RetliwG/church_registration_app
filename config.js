// Configuration for Google Sheets API with OAuth - Secure Version
const CONFIG = {
    // OAuth Configuration (set via config-setup.html)
    get GOOGLE_OAUTH_CLIENT_ID() {
        return localStorage.getItem('church_app_oauth_client_id') || 'NOT_CONFIGURED';
    },
    
    get SPREADSHEET_ID() {
        const id = localStorage.getItem('church_app_spreadsheet_id');
        // Extract just the ID if full URL was provided
        if (id && id.includes('/d/')) {
            const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : id;
        }
        return id || 'NOT_CONFIGURED';
    },
    
    // Check if configuration is complete
    isConfigured() {
        return this.GOOGLE_OAUTH_CLIENT_ID !== 'NOT_CONFIGURED' && 
               this.SPREADSHEET_ID !== 'NOT_CONFIGURED';
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        return localStorage.getItem('church_app_auth_token') !== null;
    },
    
    // Sheet names (tabs in your Google Spreadsheet)
    SHEETS: {
        PARENTS: 'Parents',
        CHILDREN: 'Children', 
        SIGNIN: 'SignInOut'
    },
    
    // Google OAuth Configuration
    OAUTH_SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    
    // OAuth endpoints
    OAUTH_ENDPOINTS: {
        AUTH_URL: 'https://accounts.google.com/oauth2/v2/auth',
        TOKEN_URL: 'https://oauth2.googleapis.com/token',
        USERINFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo'
    }
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

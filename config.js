// Configuration for Google Sheets API with OAuth - Secure Version
// 
// SECURITY NOTE: These values are intentionally hard-coded and safe to be public
// - OAuth Client ID: Designed to be visible in client-side apps (not a secret)
// - Master Config Sheet ID: Public identifier, but data access is controlled by Google Sheet permissions
// - Security comes from OAuth authentication flow and Google Drive sharing permissions
// - Only users with Editor/Viewer access to spreadsheets can access data
//
const CONFIG = {
    // OAuth Configuration (hard-coded for ease of use - safe to be public)
    GOOGLE_OAUTH_CLIENT_ID: '266571180821-ihg48bsjbkto6njcgipa1lnqq55ohjql.apps.googleusercontent.com',
    
    // Master Config Sheet ID (contains list of ministries - hard-coded)
    MASTER_CONFIG_SHEET_ID: '1E6S6_cthhJ9ENZxx1bKIlHhM3vwhXG9Fpp_1pIfVNEI',
    
    // Currently selected ministry
    get SELECTED_MINISTRY() {
        return localStorage.getItem('church_app_selected_ministry') || null;
    },
    
    set SELECTED_MINISTRY(ministryName) {
        if (ministryName) {
            localStorage.setItem('church_app_selected_ministry', ministryName);
        } else {
            localStorage.removeItem('church_app_selected_ministry');
        }
    },
    
    // Get spreadsheet ID for currently selected ministry
    get SPREADSHEET_ID() {
        const ministries = this.getMinistries();
        const selected = this.SELECTED_MINISTRY;
        
        if (selected && ministries[selected]) {
            return ministries[selected];
        }
        
        // Fallback to single ministry mode (legacy)
        const id = localStorage.getItem('church_app_spreadsheet_id');
        if (id && id.includes('/d/')) {
            const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : id;
        }
        return id || 'NOT_CONFIGURED';
    },
    
    // Get all ministries from cache
    getMinistries() {
        const stored = localStorage.getItem('church_app_ministries');
        return stored ? JSON.parse(stored) : {};
    },
    
    // Set ministries cache
    setMinistries(ministries) {
        localStorage.setItem('church_app_ministries', JSON.stringify(ministries));
    },
    
    // Check if configuration is complete
    isConfigured() {
        return this.GOOGLE_OAUTH_CLIENT_ID && this.MASTER_CONFIG_SHEET_ID;
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
        RELATIONSHIP: 'B',
        PHONE1: 'C', 
        PHONE2: 'D',
        EMAIL: 'E',
        ADDRESS: 'F',
        COLLECTOR: 'G',
        DISCLAIMER_AGREED: 'H',
        REGISTRATION_DATE: 'I',
        LAST_UPDATED: 'J'
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
        AGE: 'I',
        LAST_UPDATED: 'J'
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

// Make CONFIG available globally (remove export statement for browser compatibility)
window.CONFIG = CONFIG;
window.COLUMNS = COLUMNS;

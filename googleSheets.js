// Google Sheets API integration
class GoogleSheetsAPI {
    constructor() {
        this.gapi = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            await this.loadGAPI();
            await gapi.load('client', this.initializeGAPIClient.bind(this));
            this.isInitialized = true;
            console.log('Google Sheets API initialized successfully');
        } catch (error) {
            console.error('Error initializing Google Sheets API:', error);
            throw error;
        }
    }

    loadGAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
            } else {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            }
        });
    }

    async initializeGAPIClient() {
        await gapi.client.init({
            apiKey: CONFIG.GOOGLE_SHEETS_API_KEY,
            discoveryDocs: [CONFIG.DISCOVERY_DOC],
        });
    }

    async readSheet(sheetName, range = '') {
        try {
            const fullRange = range ? `${sheetName}!${range}` : sheetName;
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: fullRange,
            });
            return response.result.values || [];
        } catch (error) {
            console.error(`Error reading sheet ${sheetName}:`, error);
            throw error;
        }
    }

    async writeSheet(sheetName, range, values) {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${sheetName}!${range}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            });
            return response.result;
        } catch (error) {
            console.error(`Error writing to sheet ${sheetName}:`, error);
            throw error;
        }
    }

    async appendSheet(sheetName, values) {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: sheetName,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            });
            return response.result;
        } catch (error) {
            console.error(`Error appending to sheet ${sheetName}:`, error);
            throw error;
        }
    }

    async clearSheet(sheetName, range) {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${sheetName}!${range}`,
            });
            return response.result;
        } catch (error) {
            console.error(`Error clearing sheet ${sheetName}:`, error);
            throw error;
        }
    }

    // Helper method to find the next empty row
    async getNextEmptyRow(sheetName) {
        try {
            const data = await this.readSheet(sheetName);
            return data.length + 1; // +1 because sheets are 1-indexed
        } catch (error) {
            console.error(`Error getting next empty row for ${sheetName}:`, error);
            return 1; // Start from row 1 if error
        }
    }
}

// Data access layer
class DataManager {
    constructor() {
        this.sheetsAPI = new GoogleSheetsAPI();
        this.cache = {
            parents: [],
            children: [],
            signins: []
        };
        this.lastCacheUpdate = null;
    }

    async initialize() {
        await this.sheetsAPI.initialize();
        await this.setupSheetsIfNeeded();
        await this.refreshCache();
    }

    async setupSheetsIfNeeded() {
        try {
            // Check if headers exist, if not create them
            await this.setupParentsSheet();
            await this.setupChildrenSheet();
            await this.setupSignInSheet();
        } catch (error) {
            console.error('Error setting up sheets:', error);
        }
    }

    async setupParentsSheet() {
        try {
            const data = await this.sheetsAPI.readSheet(CONFIG.SHEETS.PARENTS, 'A1:F1');
            if (!data.length || data[0].length === 0) {
                // Create headers
                const headers = [['Parent Name', 'Phone 1', 'Phone 2', 'Email', 'Address', 'Registration Date']];
                await this.sheetsAPI.writeSheet(CONFIG.SHEETS.PARENTS, 'A1:F1', headers);
            }
        } catch (error) {
            console.error('Error setting up parents sheet:', error);
        }
    }

    async setupChildrenSheet() {
        try {
            const data = await this.sheetsAPI.readSheet(CONFIG.SHEETS.CHILDREN, 'A1:I1');
            if (!data.length || data[0].length === 0) {
                // Create headers
                const headers = [['Parent ID', 'First Name', 'Last Name', 'Gender', 'Media Consent', 'Other Info', 'Registration Date', 'Date of Birth', 'Age']];
                await this.sheetsAPI.writeSheet(CONFIG.SHEETS.CHILDREN, 'A1:I1', headers);
            }
        } catch (error) {
            console.error('Error setting up children sheet:', error);
        }
    }

    async setupSignInSheet() {
        try {
            const data = await this.sheetsAPI.readSheet(CONFIG.SHEETS.SIGNIN, 'A1:F1');
            if (!data.length || data[0].length === 0) {
                // Create headers
                const headers = [['Sign In Timestamp', 'Sign Out Timestamp', 'Child ID', 'Parent ID', 'Child Full Name', 'Date']];
                await this.sheetsAPI.writeSheet(CONFIG.SHEETS.SIGNIN, 'A1:F1', headers);
            }
        } catch (error) {
            console.error('Error setting up signin sheet:', error);
        }
    }

    async refreshCache() {
        try {
            showLoading();
            
            // Load all data
            const [parentData, childData, signinData] = await Promise.all([
                this.sheetsAPI.readSheet(CONFIG.SHEETS.PARENTS),
                this.sheetsAPI.readSheet(CONFIG.SHEETS.CHILDREN),
                this.sheetsAPI.readSheet(CONFIG.SHEETS.SIGNIN)
            ]);

            // Parse parents (skip header row)
            this.cache.parents = parentData.slice(1).map((row, index) => ({
                id: index + 2, // Row number in sheet (1-indexed + header)
                name: row[0] || '',
                phone1: row[1] || '',
                phone2: row[2] || '',
                email: row[3] || '',
                address: row[4] || '',
                registrationDate: row[5] || ''
            }));

            // Parse children (skip header row)
            this.cache.children = childData.slice(1).map((row, index) => ({
                id: index + 2, // Row number in sheet
                parentId: parseInt(row[0]) || 0,
                firstName: row[1] || '',
                lastName: row[2] || '',
                gender: row[3] || '',
                mediaConsent: row[4] || '',
                otherInfo: row[5] || '',
                registrationDate: row[6] || '',
                dateOfBirth: row[7] || '',
                age: this.calculateAge(row[7])
            }));

            // Parse sign-ins (skip header row)
            this.cache.signins = signinData.slice(1).map((row, index) => ({
                id: index + 2, // Row number in sheet
                signInTimestamp: row[0] || '',
                signOutTimestamp: row[1] || '',
                childId: parseInt(row[2]) || 0,
                parentId: parseInt(row[3]) || 0,
                childFullName: row[4] || '',
                date: row[5] || ''
            }));

            this.lastCacheUpdate = new Date();
            hideLoading();
            console.log('Cache refreshed successfully');
        } catch (error) {
            hideLoading();
            console.error('Error refreshing cache:', error);
            throw error;
        }
    }

    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return '';
        
        const birth = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age.toString();
    }

    // Parent operations
    async saveParent(parentData) {
        try {
            showLoading();
            
            const row = [
                parentData.name,
                parentData.phone1,
                parentData.phone2,
                parentData.email,
                parentData.address,
                new Date().toLocaleDateString()
            ];

            await this.sheetsAPI.appendSheet(CONFIG.SHEETS.PARENTS, [row]);
            await this.refreshCache();
            
            hideLoading();
            
            // Return the new parent's ID (last row)
            return this.cache.parents[this.cache.parents.length - 1].id;
        } catch (error) {
            hideLoading();
            console.error('Error saving parent:', error);
            throw error;
        }
    }

    // Child operations
    async saveChild(childData) {
        try {
            const age = this.calculateAge(childData.dateOfBirth);
            
            const row = [
                childData.parentId,
                childData.firstName,
                childData.lastName,
                childData.gender,
                childData.mediaConsent,
                childData.otherInfo,
                new Date().toLocaleDateString(),
                childData.dateOfBirth,
                age
            ];

            await this.sheetsAPI.appendSheet(CONFIG.SHEETS.CHILDREN, [row]);
            await this.refreshCache();
            
            // Return the new child's ID
            return this.cache.children[this.cache.children.length - 1].id;
        } catch (error) {
            console.error('Error saving child:', error);
            throw error;
        }
    }

    // Sign-in operations
    async signInChild(childId) {
        try {
            const child = this.getChildById(childId);
            if (!child) throw new Error('Child not found');

            const now = new Date();
            const timestamp = now.toLocaleString();
            const date = now.toLocaleDateString();

            const row = [
                timestamp,
                '', // Sign out timestamp (empty for now)
                childId,
                child.parentId,
                `${child.firstName} ${child.lastName}`,
                date
            ];

            await this.sheetsAPI.appendSheet(CONFIG.SHEETS.SIGNIN, [row]);
            await this.refreshCache();
            
            return true;
        } catch (error) {
            console.error('Error signing in child:', error);
            throw error;
        }
    }

    async signOutChild(childId) {
        try {
            // Find the most recent sign-in record for this child without a sign-out
            const signInRecord = this.cache.signins.find(record => 
                record.childId === childId && 
                !record.signOutTimestamp &&
                record.date === new Date().toLocaleDateString()
            );

            if (!signInRecord) {
                throw new Error('No active sign-in record found for this child');
            }

            const timestamp = new Date().toLocaleString();
            
            // Update the sign-out timestamp
            await this.sheetsAPI.writeSheet(
                CONFIG.SHEETS.SIGNIN, 
                `B${signInRecord.id}`, 
                [[timestamp]]
            );
            
            await this.refreshCache();
            return true;
        } catch (error) {
            console.error('Error signing out child:', error);
            throw error;
        }
    }

    // Helper methods
    getParents() {
        return this.cache.parents;
    }

    getChildren() {
        return this.cache.children;
    }

    getChildrenByParent(parentId) {
        return this.cache.children.filter(child => child.parentId === parentId);
    }

    getChildById(childId) {
        return this.cache.children.find(child => child.id === childId);
    }

    getParentById(parentId) {
        return this.cache.parents.find(parent => parent.id === parentId);
    }

    getTodaysSignIns() {
        const today = new Date().toLocaleDateString();
        return this.cache.signins.filter(record => record.date === today);
    }

    getCurrentlySignedIn() {
        const today = new Date().toLocaleDateString();
        return this.cache.signins.filter(record => 
            record.date === today && 
            record.signInTimestamp && 
            !record.signOutTimestamp
        );
    }

    searchChildren(query) {
        if (!query) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.cache.children.filter(child => 
            child.firstName.toLowerCase().includes(lowerQuery) ||
            child.lastName.toLowerCase().includes(lowerQuery) ||
            `${child.firstName} ${child.lastName}`.toLowerCase().includes(lowerQuery)
        );
    }
}

// Global data manager instance
let dataManager;

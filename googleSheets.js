// Google Sheets API Integration with OAuth
class GoogleSheetsAPI {
    constructor() {
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        this.isOnline = navigator.onLine;
        
        // Initialize IndexedDB for offline storage
        this.initOfflineStorage();
    }

    async initialize() {
        // Wait for offline storage to be ready
        await this.initOfflineStorage();
        console.log('GoogleSheetsAPI initialized');
        console.log('📊 Spreadsheet ID:', this.spreadsheetId);
    }

    async initOfflineStorage() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ChurchAppDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for offline data
                if (!db.objectStoreNames.contains('registrations')) {
                    const registrationStore = db.createObjectStore('registrations', { keyPath: 'id' });
                    registrationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    registrationStore.createIndex('synced', 'synced', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('attendances')) {
                    const attendanceStore = db.createObjectStore('attendances', { keyPath: 'id' });
                    attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
                    attendanceStore.createIndex('synced', 'synced', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('signInOuts')) {
                    const signInOutStore = db.createObjectStore('signInOuts', { keyPath: 'id' });
                    signInOutStore.createIndex('timestamp', 'timestamp', { unique: false });
                    signInOutStore.createIndex('synced', 'synced', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('offlineOperations')) {
                    const operationStore = db.createObjectStore('offlineOperations', { keyPath: 'id' });
                    operationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    operationStore.createIndex('synced', 'synced', { unique: false });
                }
            };
        });
    }

    async ensureAuthenticated() {
        if (!oauthManager) {
            oauthManager = new OAuthManager();
        }
        
        if (!oauthManager.isSignedIn()) {
            throw new Error('User not authenticated. Please sign in first.');
        }
        
        await oauthManager.refreshTokenIfNeeded();
    }

    async readSheet(sheetName, range = '') {
        try {
            await this.ensureAuthenticated();
            
            const fullRange = range ? `${sheetName}!${range}` : sheetName;
            const url = `${this.baseUrl}/${this.spreadsheetId}/values/${fullRange}`;
            
            const response = await oauthManager.authenticatedFetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.values || [];
        } catch (error) {
            console.error('Error reading sheet:', error);
            // Return cached data if available
            return this.getCachedData(sheetName) || [];
        }
    }

    async writeSheet(sheetName, range, values) {
        try {
            await this.ensureAuthenticated();
            
            const url = `${this.baseUrl}/${this.spreadsheetId}/values/${sheetName}!${range}?valueInputOption=RAW`;
            
            const response = await oauthManager.authenticatedFetch(url, {
                method: 'PUT',
                body: JSON.stringify({
                    values: values
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error writing to sheet:', error);
            // Store for offline sync
            await this.storeOfflineData('write', { sheetName, range, values });
            throw error;
        }
    }

    async appendSheet(sheetName, values) {
        try {
            await this.ensureAuthenticated();
            
            const url = `${this.baseUrl}/${this.spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW`;
            
            const response = await oauthManager.authenticatedFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    values: values
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error appending to sheet:', error);
            // Store for offline sync
            await this.storeOfflineData('append', { sheetName, values });
            throw error;
        }
    }

    async storeOfflineData(operation, data) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['offlineOperations'], 'readwrite');
        const store = transaction.objectStore('offlineOperations');
        
        const operationData = {
            id: Date.now() + Math.random(),
            operation,
            data,
            timestamp: new Date().toISOString(),
            synced: false
        };
        
        await store.add(operationData);
    }

    getCachedData(sheetName) {
        // Return cached data based on sheet name
        const cacheMap = {
            [CONFIG.SHEETS.PARENTS]: 'parents',
            [CONFIG.SHEETS.CHILDREN]: 'children',
            [CONFIG.SHEETS.SIGNIN]: 'signins'
        };
        
        return this.cache?.[cacheMap[sheetName]] || [];
    }

    async syncOfflineData() {
        if (!this.db || !navigator.onLine) return;
        
        try {
            const transaction = this.db.transaction(['offlineOperations'], 'readwrite');
            const store = transaction.objectStore('offlineOperations');
            const index = store.index('synced');
            
            const unsyncedOperations = await index.getAll(false);
            
            for (const operation of unsyncedOperations) {
                try {
                    if (operation.operation === 'append') {
                        await this.appendSheet(operation.data.sheetName, operation.data.values);
                    } else if (operation.operation === 'write') {
                        await this.writeSheet(operation.data.sheetName, operation.data.range, operation.data.values);
                    }
                    
                    // Mark as synced
                    operation.synced = true;
                    await store.put(operation);
                } catch (error) {
                    console.error('Error syncing operation:', error);
                }
            }
        } catch (error) {
            console.error('Error syncing offline data:', error);
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
        
        // Set up automatic cache refresh
        this.setupAutoRefresh();
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
            console.log('📊 Raw signin data from sheets:', signinData);
            this.cache.signins = signinData.slice(1).map((row, index) => {
                const parsed = {
                    id: index + 2, // Row number in sheet
                    signInTimestamp: row[0] || '',
                    signOutTimestamp: row[1] || '',
                    childId: parseInt(row[2]) || 0,
                    parentId: parseInt(row[3]) || 0,
                    childFullName: row[4] || '',
                    date: row[5] || ''
                };
                console.log(`📊 Parsed signin row ${index + 2}:`, parsed);
                return parsed;
            });

            this.lastCacheUpdate = new Date();
            hideLoading();
            console.log('Cache refreshed successfully');
            console.log('📊 Cache contents:', {
                parents: this.cache.parents.length,
                children: this.cache.children.length,
                signins: this.cache.signins.length
            });
            
            // Use normalized date comparison for logging today's sign-ins
            const today = new Date().toLocaleDateString();
            const normalizeDate = (dateStr) => {
                if (!dateStr) return '';
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    return `${parseInt(parts[0])}/${parseInt(parts[1])}/${parts[2]}`;
                }
                return dateStr;
            };
            const normalizedToday = normalizeDate(today);
            const todaysSignins = this.cache.signins.filter(s => normalizeDate(s.date) === normalizedToday);
            
            console.log('📅 Today\'s sign-ins:', todaysSignins);
            console.log('✅ Currently signed in:', this.getCurrentlySignedIn());
        } catch (error) {
            hideLoading();
            console.error('Error refreshing cache:', error);
            throw error;
        }
    }

    setupAutoRefresh() {
        console.log('🔄 Setting up automatic cache refresh...');
        
        // Auto-refresh every 30 seconds
        setInterval(async () => {
            console.log('⏰ Auto-refreshing cache...');
            try {
                await this.refreshCache();
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, 30000); // 30 seconds
        
        // Refresh when app becomes visible (switching between devices/tabs)
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('👁️ App became visible, refreshing cache...');
                try {
                    await this.refreshCache();
                } catch (error) {
                    console.error('Visibility refresh failed:', error);
                }
            }
        });
        
        // Refresh when window regains focus
        window.addEventListener('focus', async () => {
            console.log('🎯 Window focused, refreshing cache...');
            try {
                await this.refreshCache();
            } catch (error) {
                console.error('Focus refresh failed:', error);
            }
        });
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

            console.log('📝 Signing in child with date format:', date);
            console.log('📝 Current timestamp:', timestamp);

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
        console.log('🔍 Getting currently signed in for date:', today);
        
        // Normalize date for comparison - remove leading zeros and ensure consistent format
        const normalizeDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // Remove leading zeros: 06/10/2025 becomes 6/10/2025
                return `${parseInt(parts[0])}/${parseInt(parts[1])}/${parts[2]}`;
            }
            return dateStr;
        };
        
        const normalizedToday = normalizeDate(today);
        console.log('🔍 Normalized today date:', normalizedToday);
        
        const todaysSignins = this.cache.signins.filter(record => {
            const normalizedRecordDate = normalizeDate(record.date);
            const matches = normalizedRecordDate === normalizedToday;
            console.log(`🔍 Comparing "${normalizedRecordDate}" vs "${normalizedToday}": ${matches}`);
            return matches;
        });
        console.log('🔍 Today\'s sign-ins found:', todaysSignins);
        
        const currentlySignedIn = todaysSignins.filter(record => 
            record.signInTimestamp && 
            !record.signOutTimestamp
        );
        console.log('🔍 Currently signed in (filtered):', currentlySignedIn);
        
        return currentlySignedIn;
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

// Google Sheets API Integration with OAuth
class GoogleSheetsAPI {
    constructor() {
        // Don't cache spreadsheet ID - read dynamically to support ministry switching
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        this.isOnline = navigator.onLine;
        
        // Initialize IndexedDB for offline storage
        this.initOfflineStorage();
    }
    
    // Get current spreadsheet ID dynamically
    get spreadsheetId() {
        return CONFIG.SPREADSHEET_ID;
    }

    async initialize() {
        // Wait for offline storage to be ready
        await this.initOfflineStorage();
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

// Master Config Sheet Manager - Manages ministry list
class MasterConfigManager {
    constructor() {
        this.masterSheetId = CONFIG.MASTER_CONFIG_SHEET_ID;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        this.sheetName = 'Ministries'; // Default tab name
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

    async loadMinistries() {
        try {
            if (this.masterSheetId === 'NOT_CONFIGURED') {
                console.log('Master config sheet not configured, using localStorage only');
                return CONFIG.getMinistries();
            }

            await this.ensureAuthenticated();
            
            // Try to read from Ministries tab first, fallback to Sheet1
            let data = await this.readMinistriesSheet(this.sheetName);
            
            // If Ministries tab doesn't exist, try Sheet1
            if (!data || data.length === 0) {
                data = await this.readMinistriesSheet('Sheet1');
            }
            
            if (!data || data.length <= 1) {
                // No data or only headers
                return CONFIG.getMinistries();
            }
            
            // Parse the data (skip header row)
            const ministries = {};
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row[0] && row[1]) { // Ministry Name and Google Sheet ID/URL
                    const name = row[0].trim();
                    let sheetId = row[1].trim();
                    
                    // Extract ID from URL if full URL provided
                    if (sheetId.includes('/d/')) {
                        const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
                        sheetId = match ? match[1] : sheetId;
                    }
                    
                    ministries[name] = sheetId;
                }
            }
            
            // Cache in localStorage
            CONFIG.setMinistries(ministries);
            
            return ministries;
        } catch (error) {
            console.error('Error loading ministries from master sheet:', error);
            // Fallback to localStorage
            return CONFIG.getMinistries();
        }
    }

    async readMinistriesSheet(sheetName) {
        try {
            const url = `${this.baseUrl}/${this.masterSheetId}/values/${sheetName}`;
            const response = await oauthManager.authenticatedFetch(url);
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            return data.values || [];
        } catch (error) {
            return null;
        }
    }

    async saveMinistry(ministryName, sheetId) {
        try {
            if (this.masterSheetId === 'NOT_CONFIGURED') {
                console.log('Master config sheet not configured, saving to localStorage only');
                const ministries = CONFIG.getMinistries();
                ministries[ministryName] = sheetId;
                CONFIG.setMinistries(ministries);
                return;
            }

            await this.ensureAuthenticated();
            
            // Read current data
            let data = await this.readMinistriesSheet(this.sheetName);
            if (!data || data.length === 0) {
                // Try Sheet1
                data = await this.readMinistriesSheet('Sheet1');
                if (data && data.length > 0) {
                    this.sheetName = 'Sheet1';
                }
            }
            
            // If still no data, create headers
            if (!data || data.length === 0) {
                await this.setupMasterSheet();
                data = [['Ministry Name', 'Google Sheet ID']];
            }
            
            // Check if ministry already exists
            let existingRowIndex = -1;
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] && data[i][0].trim() === ministryName) {
                    existingRowIndex = i;
                    break;
                }
            }
            
            if (existingRowIndex >= 0) {
                // Update existing ministry
                const rowNumber = existingRowIndex + 1;
                await this.updateRow(rowNumber, [ministryName, sheetId]);
            } else {
                // Append new ministry
                await this.appendRow([ministryName, sheetId]);
            }
            
            // Update localStorage cache
            const ministries = CONFIG.getMinistries();
            ministries[ministryName] = sheetId;
            CONFIG.setMinistries(ministries);
            
        } catch (error) {
            console.error('Error saving ministry to master sheet:', error);
            // Still save to localStorage
            const ministries = CONFIG.getMinistries();
            ministries[ministryName] = sheetId;
            CONFIG.setMinistries(ministries);
        }
    }

    async removeMinistry(ministryName) {
        try {
            // Always remove from localStorage
            const ministries = CONFIG.getMinistries();
            delete ministries[ministryName];
            CONFIG.setMinistries(ministries);
            
            if (this.masterSheetId === 'NOT_CONFIGURED') {
                return;
            }

            await this.ensureAuthenticated();
            
            // Note: Google Sheets API doesn't support row deletion via values API
            // We would need to use batchUpdate with DeleteDimensionRequest
            // For now, we'll just clear the row content
            let data = await this.readMinistriesSheet(this.sheetName);
            if (!data || data.length === 0) {
                data = await this.readMinistriesSheet('Sheet1');
                if (data && data.length > 0) {
                    this.sheetName = 'Sheet1';
                }
            }
            
            if (!data || data.length === 0) return;
            
            // Find the row
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] && data[i][0].trim() === ministryName) {
                    const rowNumber = i + 1;
                    // Clear the row
                    await this.updateRow(rowNumber, ['', '']);
                    break;
                }
            }
            
        } catch (error) {
            console.error('Error removing ministry from master sheet:', error);
        }
    }

    async setupMasterSheet() {
        try {
            const url = `${this.baseUrl}/${this.masterSheetId}/values/${this.sheetName}!A1:B1?valueInputOption=RAW`;
            
            const response = await oauthManager.authenticatedFetch(url, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [['Ministry Name', 'Google Sheet ID']]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error setting up master sheet:', error);
        }
    }

    async appendRow(values) {
        try {
            const url = `${this.baseUrl}/${this.masterSheetId}/values/${this.sheetName}:append?valueInputOption=RAW`;
            
            const response = await oauthManager.authenticatedFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    values: [values]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error appending to master sheet:', error);
            throw error;
        }
    }

    async updateRow(rowNumber, values) {
        try {
            const range = `${this.sheetName}!A${rowNumber}:B${rowNumber}`;
            const url = `${this.baseUrl}/${this.masterSheetId}/values/${range}?valueInputOption=RAW`;
            
            const response = await oauthManager.authenticatedFetch(url, {
                method: 'PUT',
                body: JSON.stringify({
                    values: [values]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating master sheet row:', error);
            throw error;
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
        this.cacheMaxAge = 10 * 60 * 1000; // 10 minutes
        this.maxSigninRecords = 1000; // Limit signin records to prevent memory issues
    }

    async initialize() {
        await this.sheetsAPI.initialize();
        await this.setupSheetsIfNeeded();
        // Initial cache load
        await this.refreshCache();
        
        // Set up periodic cache cleanup
        this.setupCacheCleanup();
    }
    
    setupCacheCleanup() {
        // Clean up old signin records every hour
        setInterval(() => {
            this.cleanupOldSigninRecords();
        }, 60 * 60 * 1000); // 1 hour
    }
    
    cleanupOldSigninRecords() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const cutoffDate = thirtyDaysAgo.toLocaleDateString();
        
        // Keep only recent records to prevent memory bloat
        this.cache.signins = this.cache.signins.filter(record => {
            if (!record.date) return true; // Keep if no date
            const recordDate = new Date(record.date);
            return recordDate >= thirtyDaysAgo;
        });
        
        // Also limit total number of records
        if (this.cache.signins.length > this.maxSigninRecords) {
            // Keep only the most recent records
            this.cache.signins = this.cache.signins
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, this.maxSigninRecords);
        }
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
    
    // Check if cache needs refreshing based on age
    isCacheStale() {
        if (!this.lastCacheUpdate) return true;
        return Date.now() - this.lastCacheUpdate > this.cacheMaxAge;
    }
    
    // Smart refresh - only refresh if cache is stale or forced
    async refreshCacheIfNeeded(force = false) {
        if (force || this.isCacheStale()) {
            await this.refreshCache();
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
            this.cache.signins = signinData.slice(1).map((row, index) => {
                return {
                    id: index + 2, // Row number in sheet
                    signInTimestamp: row[0] || '',
                    signOutTimestamp: row[1] || '',
                    childId: parseInt(row[2]) || 0,
                    parentId: parseInt(row[3]) || 0,
                    childFullName: row[4] || '',
                    date: row[5] || ''
                };
            });

            this.lastCacheUpdate = new Date();
            hideLoading();
            
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
            
            // Optimize: Add to cache locally instead of full refresh
            const newParentId = this.cache.parents.length + 2; // Row number in sheet
            const newParent = {
                id: newParentId,
                name: parentData.name,
                phone1: parentData.phone1,
                phone2: parentData.phone2,
                email: parentData.email,
                address: parentData.address,
                registrationDate: new Date().toLocaleDateString()
            };
            this.cache.parents.push(newParent);
            
            hideLoading();
            
            // Return the new parent's ID
            return newParentId;
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
            
            // Optimize: Add to cache locally instead of full refresh
            const newChildId = this.cache.children.length + 2; // Row number in sheet
            const newChild = {
                id: newChildId,
                parentId: childData.parentId,
                firstName: childData.firstName,
                lastName: childData.lastName,
                gender: childData.gender,
                mediaConsent: childData.mediaConsent,
                otherInfo: childData.otherInfo,
                registrationDate: new Date().toLocaleDateString(),
                dateOfBirth: childData.dateOfBirth,
                age: age
            };
            this.cache.children.push(newChild);
            
            // Return the new child's ID
            return newChildId;
        } catch (error) {
            console.error('Error saving child:', error);
            throw error;
        }
    }

    async updateParent(parentData) {
        try {
            // parentData should include id
            const rowNumber = parentData.id;
            const range = `A${rowNumber}:F${rowNumber}`;
            
            const row = [
                parentData.name,
                parentData.phone1,
                parentData.phone2,
                parentData.email,
                parentData.address,
                // Keep original registration date - read it first or use existing
                this.cache.parents.find(p => p.id === parentData.id)?.registrationDate || new Date().toLocaleDateString()
            ];

            await this.sheetsAPI.writeSheet(CONFIG.SHEETS.PARENTS, range, [row]);
            
            // Update cache
            const parentIndex = this.cache.parents.findIndex(p => p.id === parentData.id);
            if (parentIndex !== -1) {
                this.cache.parents[parentIndex] = {
                    ...this.cache.parents[parentIndex],
                    name: parentData.name,
                    phone1: parentData.phone1,
                    phone2: parentData.phone2,
                    email: parentData.email,
                    address: parentData.address
                };
            }
            
            return parentData.id;
        } catch (error) {
            console.error('Error updating parent:', error);
            throw error;
        }
    }

    async updateChild(childData) {
        try {
            // childData should include id
            const rowNumber = childData.id;
            const age = this.calculateAge(childData.dateOfBirth);
            const range = `A${rowNumber}:I${rowNumber}`;
            
            const row = [
                childData.parentId,
                childData.firstName,
                childData.lastName,
                childData.gender,
                childData.mediaConsent,
                childData.otherInfo,
                // Keep original registration date
                this.cache.children.find(c => c.id === childData.id)?.registrationDate || new Date().toLocaleDateString(),
                childData.dateOfBirth,
                age
            ];

            await this.sheetsAPI.writeSheet(CONFIG.SHEETS.CHILDREN, range, [row]);
            
            // Update cache
            const childIndex = this.cache.children.findIndex(c => c.id === childData.id);
            if (childIndex !== -1) {
                this.cache.children[childIndex] = {
                    ...this.cache.children[childIndex],
                    parentId: childData.parentId,
                    firstName: childData.firstName,
                    lastName: childData.lastName,
                    gender: childData.gender,
                    mediaConsent: childData.mediaConsent,
                    otherInfo: childData.otherInfo,
                    dateOfBirth: childData.dateOfBirth,
                    age: age
                };
            }
            
            return childData.id;
        } catch (error) {
            console.error('Error updating child:', error);
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
            
            // Optimize: Add to cache locally instead of full refresh
            const newSigninId = this.cache.signins.length + 2; // Row number in sheet
            const newSignin = {
                id: newSigninId,
                signInTimestamp: timestamp,
                signOutTimestamp: '',
                childId: childId,
                parentId: child.parentId,
                childFullName: `${child.firstName} ${child.lastName}`,
                date: date
            };
            this.cache.signins.push(newSignin);
            
            return true;
        } catch (error) {
            console.error('Error signing in child:', error);
            throw error;
        }
    }

    async signOutChild(childId) {
        try {
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
            
            const today = new Date().toLocaleDateString();
            const normalizedToday = normalizeDate(today);
            
            // Find the most recent sign-in record for this child without a sign-out
            const signInRecord = this.cache.signins.find(record => {
                const normalizedRecordDate = normalizeDate(record.date);
                return record.childId === childId && 
                       !record.signOutTimestamp &&
                       normalizedRecordDate === normalizedToday;
            });

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
            
            // Optimize: Update cache locally instead of full refresh
            signInRecord.signOutTimestamp = timestamp;
            
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

    getChildrenByParentId(parentId) {
        return this.cache.children.filter(child => child.parentId === parentId);
    }

    getTodaysSignIns() {
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
        
        const today = new Date().toLocaleDateString();
        const normalizedToday = normalizeDate(today);
        
        return this.cache.signins.filter(record => {
            const normalizedRecordDate = normalizeDate(record.date);
            return normalizedRecordDate === normalizedToday;
        });
    }

    getCurrentlySignedIn() {
        const today = new Date().toLocaleDateString();
        
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
        
        const todaysSignins = this.cache.signins.filter(record => {
            const normalizedRecordDate = normalizeDate(record.date);
            return normalizedRecordDate === normalizedToday;
        });
        
        const currentlySignedIn = todaysSignins.filter(record => 
            record.signInTimestamp && 
            !record.signOutTimestamp
        );
        
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

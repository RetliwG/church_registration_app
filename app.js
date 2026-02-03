// Cache busting and version management
function handleCacheBusting() {
    const urlParams = new URLSearchParams(window.location.search);
    const version = urlParams.get('v');
    const timestamp = urlParams.get('t');
    
    // If we have version parameters, clear them from URL for clean navigation
    if (version || timestamp) {
        
        // Clear the URL parameters without reloading
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Force clear any cached resources
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        return caches.delete(cacheName);
                    })
                );
            });
        }
        
        // Add a visual indicator that we're loading the new version
        const body = document.body;
        if (body) {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: fixed; top: 10px; left: 10px; 
                background: #28a745; color: white; 
                padding: 8px 12px; border-radius: 4px; 
                font-size: 12px; z-index: 10000;
                font-family: Arial, sans-serif;
            `;
            indicator.textContent = `✅ Version ${version} loaded`;
            body.appendChild(indicator);
            
            // Remove indicator after 3 seconds
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 3000);
        }
    }
    
}

// Main application logic
document.addEventListener('DOMContentLoaded', async function() {
    // Check for cache-busting parameters and force refresh if needed
    handleCacheBusting();
    
    // Register Service Worker for PWA functionality
    await registerServiceWorker();
    
    // Initialize the application
    await initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update current date display
    updateCurrentDate();
    
    // Initialize mobile-specific handling
    initializeMobileHandling();
    
    // Check for app updates
    checkForUpdates();
});

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Add cache-busting parameter to service worker
            const swUrl = '/church_registration_app/sw.js?v=8&t=' + Date.now();
            const registration = await navigator.serviceWorker.register(swUrl);
            
            // Force update immediately
            await registration.update();
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showMessage('App update available! Refresh to get the latest version.', 'info');
                    }
                });
            });
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.type === 'SYNC_COMPLETE') {
                    showMessage('Data synced successfully!', 'success');
                    // Refresh the current view
                    if (document.getElementById('attendance').classList.contains('active')) {
                        refreshAttendanceView();
                    }
                }
            });
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

function checkForUpdates() {
    // Check for app updates every 5 minutes
    setInterval(async () => {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                registration.update();
            }
        }
    }, 5 * 60 * 1000); // 5 minutes
}

async function initializeApp() {
    try {
        showLoading();
        
        // Check if configuration is complete
        
        if (!CONFIG.isConfigured()) {
            hideLoading();
            const missing = [];
            if (CONFIG.GOOGLE_OAUTH_CLIENT_ID === 'NOT_CONFIGURED') missing.push('OAuth Client ID');
            if (CONFIG.SPREADSHEET_ID === 'NOT_CONFIGURED') missing.push('Spreadsheet ID');
            
            // Show immediate configuration prompt
            showConfigurationRequired(missing);
            return;
        }
        
        // Initialize OAuth manager
        oauthManager = new OAuthManager();
        await oauthManager.initialize();
        
        // Check if user is authenticated
        if (!oauthManager.isSignedIn()) {
            hideLoading();
            showAuthenticationRequired();
            return;
        }
        
        // Initialize data manager
        dataManager = new DataManager();
        await dataManager.initialize();
        
        // Initialize master config manager
        window.masterConfigManager = new MasterConfigManager();
        
        // Load ministries from master sheet
        await loadMinistries();
        
        // Load initial data
        await refreshAttendanceView();
        
        // Update user info display
        updateUserInfoDisplay();
        
        hideLoading();
        showMessage('Application initialized successfully!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error initializing app:', error);
        
        // Check if this is an authentication error
        if (error.message.includes('auth') || error.message.includes('token') || 
            error.message.includes('401') || error.message.includes('403') ||
            error.message.includes('credentials') || error.message.includes('unauthorized')) {
            console.log('Authentication error detected, prompting for sign-in');
            showAuthenticationRequired();
        } else if (error.message.includes('API key')) {
            showMessage('Configuration error. Please check your setup.', 'error');
            setTimeout(() => {
                window.location.href = 'config-setup.html';
            }, 3000);
        } else {
            // Generic error - might be auth related, show sign-in prompt
            console.log('Generic error, showing authentication prompt as fallback');
            showAuthenticationRequired();
        }
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(section);
        });
    });

    // Registration form
    document.getElementById('addChildBtn').addEventListener('click', addChildForm);
    document.getElementById('saveRegistrationBtn').addEventListener('click', saveRegistration);
    document.getElementById('clearFormBtn').addEventListener('click', clearRegistrationForm);

    // Sign in/out
    document.getElementById('childSearch').addEventListener('input', handleChildSearch);
    document.getElementById('signInBtn').addEventListener('click', signInSelectedChildren);
    document.getElementById('signOutBtn').addEventListener('click', signOutSelectedChildren);

    // Attendance
    document.getElementById('refreshAttendanceBtn').addEventListener('click', refreshAttendanceView);

    // Network status listeners for PWA
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Check initial network status
    updateNetworkStatus();

    // Add first child form by default
    addChildForm();
}

// PWA Network Status Functions
function handleOnlineStatus() {
    updateNetworkStatus();
    showMessage('You\'re back online! Syncing data...', 'success');
    
    // Trigger background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
            return registration.sync.register('church-registration-sync');
        });
    }
}

function handleOfflineStatus() {
    updateNetworkStatus();
    showMessage('You\'re offline. Data will be saved locally and synced when back online.', 'info');
}

function updateNetworkStatus() {
    const statusIndicator = getOrCreateNetworkStatusIndicator();
    
    if (navigator.onLine) {
        statusIndicator.className = 'network-status online';
        statusIndicator.innerHTML = '🟢 Online';
    } else {
        statusIndicator.className = 'network-status offline';
        statusIndicator.innerHTML = '🔴 Offline';
    }
}

function getOrCreateNetworkStatusIndicator() {
    let indicator = document.getElementById('networkStatus');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'networkStatus';
        indicator.className = 'network-status';
        
        // Add to header
        const header = document.querySelector('header');
        header.appendChild(indicator);
        
        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
            .network-status {
                position: absolute;
                top: 20px;
                right: 20px;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .network-status.online {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .network-status.offline {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
        `;
        document.head.appendChild(style);
    }
    return indicator;
}

// Navigation
function showSection(sectionName) {
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Refresh cache when switching to sign-in section to ensure new registrations appear (only if authenticated)
        if (sectionName === 'signin' && dataManager) {
            dataManager.refreshCacheIfNeeded().catch(error => {
                console.error('Error refreshing cache for sign-in section:', error);
            });
        }
        
        // Force display on mobile if needed
        if (window.innerWidth <= 768) {
            // Hide all sections explicitly
            document.querySelectorAll('.section').forEach(section => {
                section.style.display = 'none';
            });
            // Show only the target section
            targetSection.style.display = 'block';
        }
    } else {
        console.error(`❌ Section not found: ${sectionName}`);
    }
    
    // Add active class to clicked nav button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Refresh data if viewing attendance (only if authenticated)
    if (sectionName === 'attendance' && dataManager) {
        refreshAttendanceView();
    }
}

// Configuration page function - kept for backward compatibility
// Note: OAuth Client ID and Master Config Sheet ID are now hard-coded in config.js
function openConfiguration() {
    window.location.href = 'config-setup.html';
}

function initializeMobileHandling() {
    
    // Check if on mobile device
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Ensure only the active section is visible on mobile
        const activeSection = document.querySelector('.section.active');
        const allSections = document.querySelectorAll('.section');
        
        // Hide all sections first
        allSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
        
        // Show only the registration section by default
        const registrationSection = document.getElementById('registration');
        if (registrationSection) {
            registrationSection.style.display = 'block';
            registrationSection.classList.add('active');
        }
        
        // Update nav button states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const firstNavBtn = document.querySelector('.nav-btn');
        if (firstNavBtn) {
            firstNavBtn.classList.add('active');
        }
    }
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            initializeMobileHandling();
        }, 100);
    });
    
    // Listen for resize events
    window.addEventListener('resize', () => {
        const isMobileNow = window.innerWidth <= 768;
        if (isMobileNow !== isMobile) {
            initializeMobileHandling();
        }
    });
}

// Registration functionality
let childFormCounter = 0;

function addChildForm() {
    childFormCounter++;
    const container = document.getElementById('childrenContainer');
    
    const childForm = document.createElement('div');
    childForm.className = 'child-form';
    childForm.setAttribute('data-child-id', childFormCounter);
    
    childForm.innerHTML = `
        <button type="button" class="remove-child-btn" onclick="removeChildForm(${childFormCounter})">×</button>
        <h4>Child ${childFormCounter}</h4>
        
        <div class="form-row">
            <div class="form-group">
                <label for="childFirstName${childFormCounter}">First Name *</label>
                <input type="text" id="childFirstName${childFormCounter}" name="childFirstName" required>
            </div>
            <div class="form-group">
                <label for="childLastName${childFormCounter}">Last Name *</label>
                <input type="text" id="childLastName${childFormCounter}" name="childLastName" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="childGender${childFormCounter}">Gender</label>
                <select id="childGender${childFormCounter}" name="childGender">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
            </div>
            <div class="form-group">
                <label for="childDOB${childFormCounter}">Date of Birth *</label>
                <input type="date" id="childDOB${childFormCounter}" name="childDOB" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="mediaConsent${childFormCounter}">Media Consent</label>
                <input type="text" id="mediaConsent${childFormCounter}" name="mediaConsent" placeholder="e.g., Yes, No, or specify reasons">
            </div>
        </div>
        
        <div class="form-group">
            <label for="childOtherInfo${childFormCounter}">Other Information</label>
            <textarea id="childOtherInfo${childFormCounter}" name="childOtherInfo" rows="2"></textarea>
        </div>
    `;
    
    container.appendChild(childForm);
}

function removeChildForm(childId) {
    const childForm = document.querySelector(`[data-child-id="${childId}"]`);
    if (childForm) {
        childForm.remove();
    }
    
    // If no child forms remain, add one
    if (document.querySelectorAll('.child-form').length === 0) {
        addChildForm();
    }
}

async function saveRegistration() {
    try {
        showLoading();
        
        // Validate parent form
        const parentForm = document.getElementById('parentForm');
        if (!parentForm.checkValidity()) {
            parentForm.reportValidity();
            hideLoading();
            return;
        }
        
        // Get parent data
        const parentData = {
            name: document.getElementById('parentName').value.trim(),
            phone1: document.getElementById('parentPhone1').value.trim(),
            phone2: document.getElementById('parentPhone2').value.trim(),
            email: document.getElementById('parentEmail').value.trim(),
            address: document.getElementById('parentAddress').value.trim()
        };
        
        // Save or update parent
        let parentId;
        if (editingParentId) {
            // Update existing parent
            parentData.id = editingParentId;
            await dataManager.updateParent(parentData);
            parentId = editingParentId;
        } else {
            // Create new parent
            parentId = await dataManager.saveParent(parentData);
        }
        
        // Get and save/update children
        const childForms = document.querySelectorAll('.child-form');
        const childPromises = [];
        
        for (const childForm of childForms) {
            const formId = childForm.getAttribute('data-child-id');
            
            const firstName = document.getElementById(`childFirstName${formId}`).value.trim();
            const lastName = document.getElementById(`childLastName${formId}`).value.trim();
            const dateOfBirth = document.getElementById(`childDOB${formId}`).value;
            
            // Validate required fields
            if (!firstName || !lastName || !dateOfBirth) {
                hideLoading();
                showMessage('Please fill in all required child fields.', 'error');
                return;
            }
            
            const childData = {
                parentId: parentId,
                firstName: firstName,
                lastName: lastName,
                gender: document.getElementById(`childGender${formId}`).value,
                mediaConsent: document.getElementById(`mediaConsent${formId}`).value,
                otherInfo: document.getElementById(`childOtherInfo${formId}`).value.trim(),
                dateOfBirth: dateOfBirth
            };
            
            // Check if this child is being edited
            const existingChildId = editingChildIds.get(parseInt(formId));
            if (existingChildId) {
                // Update existing child
                childData.id = existingChildId;
                childPromises.push(dataManager.updateChild(childData));
            } else {
                // Create new child
                childPromises.push(dataManager.saveChild(childData));
            }
        }
        
        await Promise.all(childPromises);
        
        hideLoading();
        showMessage('Registration saved successfully!', 'success');
        clearRegistrationForm();
        
    } catch (error) {
        hideLoading();
        console.error('Error saving registration:', error);
        showMessage('Error saving registration. Please try again.', 'error');
    }
}

function clearRegistrationForm() {
    // Clear parent form
    document.getElementById('parentForm').reset();
    
    // Clear edit mode
    editingParentId = null;
    editingChildIds.clear();
    
    // Remove all child forms and add one empty one
    document.getElementById('childrenContainer').innerHTML = '';
    childFormCounter = 0;
    addChildForm();
}

function loadChildForEditing(childId) {
    try {
        const child = dataManager.getChildById(childId);
        if (!child) {
            showMessage('Child not found.', 'error');
            return;
        }
        
        const parent = dataManager.getParentById(child.parentId);
        if (!parent) {
            showMessage('Parent information not found.', 'error');
            return;
        }
        
        // Switch to registration section
        showSection('registration');
        
        // Clear existing form
        clearRegistrationForm();
        
        // Set edit mode
        editingParentId = parent.id;
        editingChildIds.clear();
        
        // Populate parent information
        document.getElementById('parentName').value = parent.name || '';
        document.getElementById('parentPhone1').value = parent.phone1 || '';
        document.getElementById('parentPhone2').value = parent.phone2 || '';
        document.getElementById('parentEmail').value = parent.email || '';
        document.getElementById('parentAddress').value = parent.address || '';
        
        // Get all children for this parent
        const siblings = dataManager.getChildrenByParentId(child.parentId);
        
        // Clear the default empty child form
        document.getElementById('childrenContainer').innerHTML = '';
        childFormCounter = 0;
        
        // Add a form for each child
        siblings.forEach(sibling => {
            addChildForm();
            const formId = childFormCounter;
            
            // Track the actual child ID for this form
            editingChildIds.set(formId, sibling.id);
            
            // Populate child information
            document.getElementById(`childFirstName${formId}`).value = sibling.firstName || '';
            document.getElementById(`childLastName${formId}`).value = sibling.lastName || '';
            
            // Convert date format from M/D/YYYY to YYYY-MM-DD for input field
            let formattedDate = '';
            if (sibling.dateOfBirth) {
                const dateParts = sibling.dateOfBirth.split('/');
                if (dateParts.length === 3) {
                    const month = dateParts[0].padStart(2, '0');
                    const day = dateParts[1].padStart(2, '0');
                    const year = dateParts[2];
                    formattedDate = `${year}-${month}-${day}`;
                }
            }
            document.getElementById(`childDOB${formId}`).value = formattedDate;
            
            document.getElementById(`childGender${formId}`).value = sibling.gender || '';
            document.getElementById(`mediaConsent${formId}`).value = sibling.mediaConsent || '';
            document.getElementById(`childOtherInfo${formId}`).value = sibling.otherInfo || '';
        });
        
        showMessage('Child information loaded for editing. Update any fields and click Save.', 'info');
        
    } catch (error) {
        console.error('Error loading child for editing:', error);
        showMessage('Error loading child information.', 'error');
    }
}

// Sign in/out functionality
let selectedChildren = [];
let editingParentId = null; // Track if we're editing an existing parent
let editingChildIds = new Map(); // Map form counter to actual child ID

function handleChildSearch(event) {
    const query = event.target.value.trim();
    const suggestionsContainer = document.getElementById('childSuggestions');
    
    if (query.length < 2) {
        suggestionsContainer.innerHTML = '';
        return;
    }
    
    const matchingChildren = dataManager.searchChildren(query);
    
    suggestionsContainer.innerHTML = '';
    
    matchingChildren.forEach(child => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion-item';
        suggestion.textContent = `${child.firstName} ${child.lastName}`;
        suggestion.addEventListener('click', () => selectChild(child));
        suggestionsContainer.appendChild(suggestion);
    });
}

function selectChild(child) {
    // Check if child is already selected
    if (selectedChildren.find(c => c.id === child.id)) {
        showMessage('Child is already selected.', 'info');
        return;
    }
    
    selectedChildren.push(child);
    updateSelectedChildrenDisplay();
    
    // Clear search
    document.getElementById('childSearch').value = '';
    document.getElementById('childSuggestions').innerHTML = '';
}

function removeSelectedChild(childId) {
    selectedChildren = selectedChildren.filter(child => child.id !== childId);
    updateSelectedChildrenDisplay();
}

function updateSelectedChildrenDisplay() {
    const container = document.getElementById('selectedChildren');
    
    if (selectedChildren.length === 0) {
        container.innerHTML = '<p>No children selected</p>';
        return;
    }
    
    container.innerHTML = selectedChildren.map(child => `
        <div class="selected-child">
            ${child.firstName} ${child.lastName}
            <button type="button" class="remove-btn" onclick="removeSelectedChild(${child.id})">×</button>
        </div>
    `).join('');
}

async function signInSelectedChildren() {
    if (selectedChildren.length === 0) {
        showMessage('Please select children to sign in.', 'info');
        return;
    }
    
    try {
        showLoading();
        
        
        // Process children sequentially to avoid race conditions with Google Sheets API
        let successCount = 0;
        for (const child of selectedChildren) {
            try {
                await dataManager.signInChild(child.id);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to sign in ${child.firstName} ${child.lastName}:`, error);
            }
        }
        
        hideLoading();
        
        if (successCount === selectedChildren.length) {
            showMessage(`Successfully signed in all ${selectedChildren.length} children.`, 'success');
        } else if (successCount > 0) {
            showMessage(`Signed in ${successCount} of ${selectedChildren.length} children. Some may have failed.`, 'warning');
        } else {
            showMessage('Failed to sign in any children. Please try again.', 'error');
        }
        
        // Clear selection
        selectedChildren = [];
        updateSelectedChildrenDisplay();
        
        // Refresh attendance view if visible
        if (document.getElementById('attendance').classList.contains('active')) {
            await refreshAttendanceView();
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error signing in children:', error);
        showMessage('Error signing in children. Please try again.', 'error');
    }
}

async function signOutSelectedChildren() {
    if (selectedChildren.length === 0) {
        showMessage('Please select children to sign out.', 'info');
        return;
    }
    
    try {
        showLoading();
        
        console.log(`🔄 Signing out ${selectedChildren.length} children...`);
        
        // Process children sequentially to avoid race conditions with Google Sheets API
        let successCount = 0;
        for (const child of selectedChildren) {
            try {
                console.log(`📝 Signing out: ${child.firstName} ${child.lastName} (ID: ${child.id})`);
                await dataManager.signOutChild(child.id);
                successCount++;
                console.log(`✅ Successfully signed out: ${child.firstName} ${child.lastName}`);
            } catch (error) {
                console.error(`❌ Failed to sign out ${child.firstName} ${child.lastName}:`, error);
            }
        }
        
        hideLoading();
        
        if (successCount === selectedChildren.length) {
            showMessage(`Successfully signed out all ${selectedChildren.length} children.`, 'success');
        } else if (successCount > 0) {
            showMessage(`Signed out ${successCount} of ${selectedChildren.length} children. Some may have failed.`, 'warning');
        } else {
            showMessage('Failed to sign out any children. Please try again.', 'error');
        }
        
        // Clear selection
        selectedChildren = [];
        updateSelectedChildrenDisplay();
        
        // Refresh attendance view if visible
        if (document.getElementById('attendance').classList.contains('active')) {
            await refreshAttendanceView();
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error signing out children:', error);
        showMessage('Error signing out children. Please try again.', 'error');
    }
}

// Attendance functionality
async function refreshAttendanceView() {
    try {
        // Check if dataManager is available (user is authenticated)
        if (!dataManager) {
            console.warn('Cannot refresh attendance: user not authenticated');
            return;
        }
        
        showLoading();
        
        await dataManager.refreshCacheIfNeeded(true); // Force refresh for attendance view
        const currentlySignedIn = dataManager.getCurrentlySignedIn();
        
        updateAttendanceTable(currentlySignedIn);
        updateAttendanceCount(currentlySignedIn.length);
        
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error refreshing attendance:', error);
        showMessage('Error loading attendance data.', 'error');
    }
}

function updateAttendanceTable(signInRecords) {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (signInRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No children currently signed in</td></tr>';
        return;
    }
    
    tbody.innerHTML = signInRecords.map(record => {
        const child = dataManager.getChildById(record.childId);
        const parent = dataManager.getParentById(record.parentId);
        
        return `
            <tr>
                <td>${record.childFullName}</td>
                <td>${parent ? parent.name : 'Unknown'}</td>
                <td>${record.signInTimestamp}</td>
                <td>
                    <button type="button" class="btn btn-primary" onclick="loadChildForEditing(${record.childId})" style="margin-right: 10px;">
                        Edit
                    </button>
                    <button type="button" class="btn btn-warning" onclick="signOutFromAttendance(${record.childId})">
                        Sign Out
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateAttendanceCount(count) {
    document.getElementById('attendanceCount').textContent = `${count} children signed in`;
}

async function signOutFromAttendance(childId) {
    try {
        showLoading();
        
        await dataManager.signOutChild(childId);
        
        hideLoading();
        showMessage('Child signed out successfully.', 'success');
        
        await refreshAttendanceView();
        
    } catch (error) {
        hideLoading();
        console.error('Error signing out child:', error);
        showMessage('Error signing out child. Please try again.', 'error');
    }
}

// Utility functions
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
    
    // Allow manual removal
    messageEl.addEventListener('click', () => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    });
}

// Authentication functions
function showAuthenticationRequired() {
    console.log('Showing authentication required screen');
    
    const authHtml = `
        <div class="auth-required">
            <h2>Authentication Required</h2>
            <p>Please sign in with your Google account to access the church registration system.</p>
            <p>This ensures that sensitive information remains private and secure.</p>
            <button id="signInButton" class="btn btn-primary">Sign In with Google</button>
        </div>
    `;
    
    // Hide all sections first
    const sections = document.querySelectorAll('.section');
    console.log('Found sections:', sections.length);
    sections.forEach(section => section.style.display = 'none');
    
    // Find the container and add auth content
    const container = document.querySelector('.container');
    console.log('Found container:', container);
    
    if (container) {
        // Create a temporary div for auth content
        let authDiv = document.getElementById('authContent');
        if (!authDiv) {
            authDiv = document.createElement('div');
            authDiv.id = 'authContent';
            container.appendChild(authDiv);
        }
        
        console.log('Setting auth content');
        authDiv.innerHTML = authHtml;
        
        // Add event listener with error handling
        const signInButton = document.getElementById('signInButton');
        if (signInButton) {
            signInButton.addEventListener('click', handleSignIn);
            console.log('Sign in button event listener added');
        } else {
            console.error('Sign in button not found after setting innerHTML');
        }
    } else {
        console.error('Could not find container element for authentication');
        // Fallback: try to use body
        const body = document.body;
        if (body) {
            console.log('Using body as fallback');
            const authDiv = document.createElement('div');
            authDiv.id = 'authContent';
            authDiv.innerHTML = authHtml;
            body.appendChild(authDiv);
            
            const signInButton = document.getElementById('signInButton');
            if (signInButton) {
                signInButton.addEventListener('click', handleSignIn);
            }
        }
    }
}

async function handleSignIn() {
    console.log('handleSignIn called');
    try {
        showLoading();
        
        if (!oauthManager) {
            console.log('Creating new OAuth manager');
            oauthManager = new OAuthManager();
            await oauthManager.initialize();
        }
        
        console.log('Attempting sign in...');
        const success = await oauthManager.signIn();
        console.log('Sign in result:', success);
        
        if (success) {
            showMessage('Signed in successfully!', 'success');
            console.log('Removing auth content...');
            
            // Remove auth content and restore sections
            const authDiv = document.getElementById('authContent');
            if (authDiv) {
                authDiv.remove();
                console.log('Auth content removed');
            }
            
            // Show all sections again
            const sections = document.querySelectorAll('.section');
            console.log('Restoring sections:', sections.length);
            sections.forEach(section => section.style.display = 'block');
            
            // Reinitialize the app
            console.log('Reinitializing app...');
            await initializeApp();
        } else {
            hideLoading();
            showMessage('Sign-in was cancelled or failed.', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Sign-in error:', error);
        showMessage('Sign-in failed. Please try again.', 'error');
    }
}

async function handleSignOut() {
    try {
        const success = await oauthManager.signOut();
        if (success) {
            showMessage('Signed out successfully.', 'info');
            showAuthenticationRequired();
        }
    } catch (error) {
        console.error('Sign-out error:', error);
        showMessage('Sign-out failed.', 'error');
    }
}

function updateUserInfoDisplay() {
    const userInfo = oauthManager.getUserInfo();
    if (userInfo) {
        // Add user info to header if not already present
        const header = document.querySelector('header');
        let userInfoEl = document.getElementById('userInfo');
        
        if (!userInfoEl) {
            userInfoEl = document.createElement('div');
            userInfoEl.id = 'userInfo';
            userInfoEl.className = 'user-info';
            header.appendChild(userInfoEl);
        }
        
        userInfoEl.innerHTML = `
            <span>Welcome, ${userInfo.name}</span>
            <button id="signOutButton" class="btn btn-secondary btn-sm">Sign Out</button>
        `;
        
        document.getElementById('signOutButton').addEventListener('click', handleSignOut);
    }
}

function showConfigurationRequired(missing) {
    console.log('Showing configuration required screen for missing:', missing);
    
    const configHtml = `
        <div class="config-required">
            <h2>⚙️ Configuration Required</h2>
            <p>The application needs to be configured before you can use it.</p>
            <p><strong>Missing configuration:</strong> ${missing.join(', ')}</p>
            <div class="config-steps">
                <h3>What you need to do:</h3>
                <ol>
                    ${missing.includes('Spreadsheet ID') ? '<li><strong>Create a Google Spreadsheet</strong> for storing registration data</li>' : ''}
                    ${missing.includes('OAuth Client ID') ? '<li><strong>Set up Google OAuth credentials</strong> for secure authentication</li>' : ''}
                    <li><strong>Enter the configuration details</strong> in the setup page</li>
                </ol>
            </div>
            <div class="config-actions">
                <button id="openConfigButton" class="btn btn-primary">
                    🚀 Open Configuration Setup
                </button>
                <button id="retryConfigButton" class="btn btn-secondary">
                    🔄 Check Configuration Again
                </button>
            </div>
        </div>
    `;
    
    // Hide all sections first
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.style.display = 'none');
    
    // Find the container and add config content
    const container = document.querySelector('.container');
    
    if (container) {
        // Create or update config div
        let configDiv = document.getElementById('configContent');
        if (!configDiv) {
            configDiv = document.createElement('div');
            configDiv.id = 'configContent';
            container.appendChild(configDiv);
        }
        
        configDiv.innerHTML = configHtml;
        
        // Add event listeners
        const openConfigButton = document.getElementById('openConfigButton');
        const retryConfigButton = document.getElementById('retryConfigButton');
        
        if (openConfigButton) {
            openConfigButton.addEventListener('click', () => {
                window.location.href = 'config-setup.html';
            });
        }
        
        if (retryConfigButton) {
            retryConfigButton.addEventListener('click', () => {
                // Remove config content and retry initialization
                configDiv.remove();
                // Show sections again
                sections.forEach(section => section.style.display = 'block');
                // Retry initialization
                initializeApp();
            });
        }
    }
}

// Make functions available globally for onclick handlers
window.showSection = showSection;
window.openConfiguration = openConfiguration;
window.removeChildForm = removeChildForm;
window.removeSelectedChild = removeSelectedChild;
window.signOutFromAttendance = signOutFromAttendance;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
window.switchMinistry = switchMinistry;
window.addMinistry = addMinistry;
window.removeMinistry = removeMinistry;

// Ministry Management Functions
async function loadMinistries() {
    try {
        // Load from master config sheet (falls back to localStorage if not configured)
        const ministries = await window.masterConfigManager.loadMinistries();
        updateMinistriesDisplay(ministries);
        updateMinistrySelector(ministries);
    } catch (error) {
        console.error('Error loading ministries:', error);
        // Fallback to localStorage
        const ministries = CONFIG.getMinistries();
        updateMinistriesDisplay(ministries);
        updateMinistrySelector(ministries);
    }
}

function updateMinistriesDisplay(ministries) {
    const container = document.getElementById('ministriesList');
    
    if (!ministries || Object.keys(ministries).length === 0) {
        container.innerHTML = '<p>No ministries configured yet.</p>';
        return;
    }
    
    const selectedMinistry = CONFIG.SELECTED_MINISTRY;
    
    container.innerHTML = Object.entries(ministries).map(([name, sheetId]) => `
        <div class="ministry-item ${name === selectedMinistry ? 'selected' : ''}">
            <div class="ministry-info">
                <strong>${name}</strong>
                <small>Sheet ID: ${sheetId}</small>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeMinistry('${name}')">
                Remove
            </button>
        </div>
    `).join('');
}

function updateMinistrySelector(ministries) {
    const selector = document.getElementById('ministrySelector');
    const selectedMinistry = CONFIG.SELECTED_MINISTRY;
    
    if (!ministries || Object.keys(ministries).length === 0) {
        selector.style.display = 'none';
        return;
    }
    
    selector.style.display = 'block';
    selector.innerHTML = '<option value="">Select Ministry...</option>' +
        Object.keys(ministries).map(name => 
            `<option value="${name}" ${name === selectedMinistry ? 'selected' : ''}>${name}</option>`
        ).join('');
}

async function addMinistry(event) {
    event.preventDefault();
    
    try {
        showLoading();
        
        const name = document.getElementById('ministryName').value.trim();
        const url = document.getElementById('ministrySheetUrl').value.trim();
        
        if (!name || !url) {
            showMessage('Please fill in all fields.', 'error');
            hideLoading();
            return;
        }
        
        // Extract sheet ID from URL
        let sheetId = url;
        if (url.includes('/d/')) {
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            sheetId = match ? match[1] : url;
        }
        
        // Get existing ministries
        const ministries = CONFIG.getMinistries();
        
        // Check if ministry already exists
        if (ministries[name]) {
            showMessage('A ministry with this name already exists.', 'error');
            hideLoading();
            return;
        }
        
        // Save to master config sheet (also updates localStorage)
        await window.masterConfigManager.saveMinistry(name, sheetId);
        
        // If this is the first ministry, select it
        const updatedMinistries = CONFIG.getMinistries();
        if (Object.keys(updatedMinistries).length === 1) {
            CONFIG.SELECTED_MINISTRY = name;
        }
        
        // Reload ministries from sheet
        await loadMinistries();
        
        // Clear form
        document.getElementById('addMinistryForm').reset();
        
        hideLoading();
        showMessage(`Ministry "${name}" added successfully!`, 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error adding ministry:', error);
        showMessage('Error adding ministry. Please try again.', 'error');
    }
}

async function removeMinistry(name) {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) {
        return;
    }
    
    try {
        showLoading();
        
        // Remove from master config sheet (also updates localStorage)
        await window.masterConfigManager.removeMinistry(name);
        
        // If we removed the selected ministry, clear selection
        if (CONFIG.SELECTED_MINISTRY === name) {
            CONFIG.SELECTED_MINISTRY = null;
            
            // Select first available ministry if any exist
            const ministries = CONFIG.getMinistries();
            const remaining = Object.keys(ministries);
            if (remaining.length > 0) {
                CONFIG.SELECTED_MINISTRY = remaining[0];
            }
        }
        
        // Reload ministries from sheet
        await loadMinistries();
        
        hideLoading();
        showMessage(`Ministry "${name}" removed.`, 'success');
        
        // Reload data if we switched ministries
        if (dataManager) {
            await dataManager.refreshCache();
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error removing ministry:', error);
        showMessage('Error removing ministry.', 'error');
    }
}

async function switchMinistry() {
    try {
        const selector = document.getElementById('ministrySelector');
        const selectedName = selector.value;
        
        if (!selectedName) {
            return;
        }
        
        showLoading();
        
        CONFIG.SELECTED_MINISTRY = selectedName;
        
        // Reload data for new ministry
        if (dataManager) {
            await dataManager.refreshCache();
            
            // Refresh current view
            const activeSection = document.querySelector('.section.active');
            if (activeSection) {
                const sectionId = activeSection.id;
                if (sectionId === 'attendance') {
                    await refreshAttendanceView();
                } else if (sectionId === 'ministries') {
                    // Update the ministry list display to show new selection
                    const ministries = CONFIG.getMinistries();
                    updateMinistriesDisplay(ministries);
                }
            }
        }
        
        hideLoading();
        showMessage(`Switched to ${selectedName}`, 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error switching ministry:', error);
        showMessage('Error switching ministry.', 'error');
    }
}


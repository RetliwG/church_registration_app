// Main application logic
document.addEventListener('DOMContentLoaded', async function() {
    // Register Service Worker for PWA functionality
    await registerServiceWorker();
    
    // Initialize the application
    await initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update current date display
    updateCurrentDate();
    
    // Check for app updates
    checkForUpdates();
});

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/church_registration_app/sw.js');
            console.log('Service Worker registered successfully:', registration);
            
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
            showMessage('Configuration required. Redirecting to setup...', 'info');
            setTimeout(() => {
                window.location.href = 'config-setup.html';
            }, 2000);
            return;
        }
        
        // Initialize OAuth manager
        oauthManager = new OAuthManager();
        
        // Check if user is authenticated
        if (!oauthManager.isSignedIn()) {
            hideLoading();
            showAuthenticationRequired();
            return;
        }
        
        // Initialize data manager
        dataManager = new DataManager();
        await dataManager.initialize();
        
        // Load initial data
        await refreshAttendanceView();
        
        // Update user info display
        updateUserInfoDisplay();
        
        hideLoading();
        showMessage('Application initialized successfully!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error initializing app:', error);
        if (error.message.includes('API key') || error.message.includes('credentials')) {
            showMessage('Configuration error. Please check your setup.', 'error');
            setTimeout(() => {
                window.location.href = 'config-setup.html';
            }, 3000);
        } else {
            showMessage('Error initializing application. Please check your Google Sheets configuration.', 'error');
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
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to clicked nav button
    event.target.classList.add('active');
    
    // Refresh data if viewing attendance
    if (sectionName === 'attendance') {
        refreshAttendanceView();
    }
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
                <select id="mediaConsent${childFormCounter}" name="mediaConsent">
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
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
        
        // Save parent
        const parentId = await dataManager.saveParent(parentData);
        
        // Get and save children
        const childForms = document.querySelectorAll('.child-form');
        const childPromises = [];
        
        for (const childForm of childForms) {
            const childId = childForm.getAttribute('data-child-id');
            
            const firstName = document.getElementById(`childFirstName${childId}`).value.trim();
            const lastName = document.getElementById(`childLastName${childId}`).value.trim();
            const dateOfBirth = document.getElementById(`childDOB${childId}`).value;
            
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
                gender: document.getElementById(`childGender${childId}`).value,
                mediaConsent: document.getElementById(`mediaConsent${childId}`).value,
                otherInfo: document.getElementById(`childOtherInfo${childId}`).value.trim(),
                dateOfBirth: dateOfBirth
            };
            
            childPromises.push(dataManager.saveChild(childData));
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
    
    // Remove all child forms and add one empty one
    document.getElementById('childrenContainer').innerHTML = '';
    childFormCounter = 0;
    addChildForm();
}

// Sign in/out functionality
let selectedChildren = [];

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
        
        const promises = selectedChildren.map(child => dataManager.signInChild(child.id));
        await Promise.all(promises);
        
        hideLoading();
        showMessage(`Successfully signed in ${selectedChildren.length} children.`, 'success');
        
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
        
        const promises = selectedChildren.map(child => dataManager.signOutChild(child.id));
        await Promise.all(promises);
        
        hideLoading();
        showMessage(`Successfully signed out ${selectedChildren.length} children.`, 'success');
        
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
        showLoading();
        
        await dataManager.refreshCache();
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
    const authHtml = `
        <div class="auth-required">
            <h2>Authentication Required</h2>
            <p>Please sign in with your Google account to access the church registration system.</p>
            <p>This ensures that sensitive information remains private and secure.</p>
            <button id="signInButton" class="btn btn-primary">Sign In with Google</button>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = authHtml;
    document.getElementById('signInButton').addEventListener('click', handleSignIn);
}

async function handleSignIn() {
    try {
        showLoading();
        const success = await oauthManager.signIn();
        
        if (success) {
            showMessage('Signed in successfully!', 'success');
            // Reinitialize the app
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

// Make functions available globally for onclick handlers
window.showSection = showSection;
window.removeChildForm = removeChildForm;
window.removeSelectedChild = removeSelectedChild;
window.signOutFromAttendance = signOutFromAttendance;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;

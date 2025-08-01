// Main application logic
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize the application
    await initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update current date display
    updateCurrentDate();
});

async function initializeApp() {
    try {
        showLoading();
        
        // Initialize data manager
        dataManager = new DataManager();
        await dataManager.initialize();
        
        // Load initial data
        await refreshAttendanceView();
        
        hideLoading();
        showMessage('Application initialized successfully!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error initializing app:', error);
        showMessage('Error initializing application. Please check your Google Sheets configuration.', 'error');
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

    // Add first child form by default
    addChildForm();
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

// Make functions available globally for onclick handlers
window.showSection = showSection;
window.removeChildForm = removeChildForm;
window.removeSelectedChild = removeSelectedChild;
window.signOutFromAttendance = signOutFromAttendance;

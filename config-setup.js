// Configuration setup for secure OAuth credential management
document.addEventListener('DOMContentLoaded', function() {
    // Check if configuration already exists
    checkExistingConfig();
    
    // Set up event listeners
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfiguration);
    document.getElementById('testAuthBtn').addEventListener('click', testAuthentication);
    document.getElementById('proceedToAppBtn').addEventListener('click', proceedToApp);
});

function checkExistingConfig() {
    const clientId = localStorage.getItem('church_app_oauth_client_id');
    const spreadsheetId = localStorage.getItem('church_app_spreadsheet_id');
    
    if (clientId && spreadsheetId) {
        document.getElementById('oauthClientId').value = clientId;
        document.getElementById('spreadsheetId').value = spreadsheetId;
        updateConnectionStatus('Configuration found in browser storage', 'info');
        document.getElementById('proceedToAppBtn').disabled = false;
    }
}

function saveConfiguration() {
    const clientId = document.getElementById('oauthClientId').value.trim();
    const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
    
    if (!clientId || !spreadsheetId) {
        updateConnectionStatus('Please fill in both fields', 'error');
        return;
    }
    
    // Store OAuth configuration in browser's local storage
    localStorage.setItem('church_app_oauth_client_id', clientId);
    localStorage.setItem('church_app_spreadsheet_id', spreadsheetId);
    
    updateConnectionStatus('Configuration saved to browser storage', 'success');
    document.getElementById('proceedToAppBtn').disabled = false;
}

async function testAuthentication() {
    const clientId = document.getElementById('oauthClientId').value.trim();
    const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
    
    if (!clientId || !spreadsheetId) {
        updateConnectionStatus('Please fill in both fields first', 'error');
        return;
    }
    
    updateConnectionStatus('Testing OAuth authentication...', 'info');
    
    try {
        // Temporarily store the config for testing
        window.CONFIG = {
            GOOGLE_OAUTH_CLIENT_ID: clientId,
            GOOGLE_SPREADSHEET_ID: spreadsheetId,
            OAUTH_SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
        };
        
        // Wait for Google Identity Services to be ready
        await new Promise((resolve) => {
            const checkGIS = () => {
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    resolve();
                } else {
                    setTimeout(checkGIS, 100);
                }
            };
            checkGIS();
        });
        
        // Initialize token client
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: async (response) => {
                if (response.error) {
                    console.error('OAuth error:', response.error);
                    updateConnectionStatus(`❌ Authentication failed: ${response.error}`, 'error');
                    return;
                }
                
                try {
                    // Test access to the spreadsheet
                    await testSpreadsheetAccess(response.access_token, spreadsheetId);
                    updateConnectionStatus('✅ Authentication successful! You can now save the configuration.', 'success');
                    document.getElementById('proceedToAppBtn').disabled = false;
                } catch (error) {
                    updateConnectionStatus(`❌ Spreadsheet access failed: ${error.message}`, 'error');
                }
            }
        });
        
        // Request access token
        tokenClient.requestAccessToken();
        
    } catch (error) {
        console.error('Authentication test failed:', error);
        updateConnectionStatus(`❌ Authentication failed: ${error.message}`, 'error');
    }
}

async function testSpreadsheetAccess(accessToken, spreadsheetId) {
    try {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
        const response = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateConnectionStatus(`✅ Authentication successful! Access to spreadsheet: "${data.properties.title}"`, 'success');
            
            // Auto-save if test is successful
            saveConfiguration();
        } else {
            const errorData = await response.json();
            updateConnectionStatus(`❌ Spreadsheet access failed: ${errorData.error.message}`, 'error');
        }
    } catch (error) {
        updateConnectionStatus(`❌ Spreadsheet test failed: ${error.message}`, 'error');
    }
}

function updateConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.className = `connection-status ${type}`;
    statusDiv.textContent = message;
}

function proceedToApp() {
    // Redirect to the main application
    window.location.href = 'index.html';
}

// Add CSS for connection status
const style = document.createElement('style');
style.textContent = `
    .connection-status {
        margin: 15px 0;
        padding: 12px;
        border-radius: 6px;
        font-weight: 500;
    }
    
    .connection-status.success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .connection-status.error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    
    .connection-status.info {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }
    
    .info-box {
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }
    
    .info-box h3 {
        margin-top: 0;
        color: #495057;
    }
    
    .info-box ul {
        margin: 10px 0 0 20px;
    }
    
    .info-box li {
        margin-bottom: 5px;
        color: #6c757d;
    }
    
    small {
        display: block;
        color: #6c757d;
        font-size: 12px;
        margin-top: 4px;
    }
`;
document.head.appendChild(style);

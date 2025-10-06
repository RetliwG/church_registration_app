// OAuth Authentication Manager for Google Sheets API - Updated for Google Identity Services (GIS)
class OAuthManager {
    constructor() {
        this.tokenClient = null;
        this.accessToken = null;
        this.isInitialized = false;
        this.currentUser = null;
    }

    async initialize() {
        try {
            // Wait for Google Identity Services to load
            await this.waitForGoogleIdentityServices();

            // Initialize the token client
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.GOOGLE_OAUTH_CLIENT_ID,
                scope: CONFIG.OAUTH_SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('OAuth error:', response.error);
                        throw new Error(response.error);
                    }
                    this.accessToken = response.access_token;
                    this.storeAuthToken(response);
                }
            });

            this.isInitialized = true;

            // Check if we have a stored valid token
            if (this.isTokenValid()) {
                this.accessToken = localStorage.getItem('church_app_auth_token');
                this.currentUser = { signedIn: true };
            }

        } catch (error) {
            console.error('Error initializing OAuth:', error);
            throw error;
        }
    }

    waitForGoogleIdentityServices() {
        return new Promise((resolve, reject) => {
            const checkGoogleLoaded = () => {
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    resolve();
                } else {
                    setTimeout(checkGoogleLoaded, 100);
                }
            };
            checkGoogleLoaded();
            
            // Timeout after 10 seconds
            setTimeout(() => reject(new Error('Google Identity Services failed to load')), 10000);
        });
    }

    async signIn() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            return new Promise((resolve, reject) => {
                this.tokenClient.callback = (response) => {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    this.accessToken = response.access_token;
                    this.storeAuthToken(response);
                    this.currentUser = { signedIn: true };
                    resolve(true);
                };
                
                this.tokenClient.requestAccessToken();
            });
        } catch (error) {
            console.error('Sign-in failed:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            if (this.accessToken) {
                // Revoke the token
                google.accounts.oauth2.revoke(this.accessToken);
                this.accessToken = null;
                this.currentUser = null;
                this.clearAuthToken();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Sign-out failed:', error);
            throw error;
        }
    }

    isSignedIn() {
        return !!this.accessToken && this.isTokenValid();
    }

    getAccessToken() {
        return this.accessToken;
    }

    getUserInfo() {
        // Note: Google Identity Services doesn't provide user info directly
        // We'll need to make a separate API call to get user details if needed
        const storedInfo = localStorage.getItem('church_app_user_info');
        return storedInfo ? JSON.parse(storedInfo) : null;
    }

    storeAuthToken(response) {
        if (response && response.access_token) {
            const expiresAt = Date.now() + (response.expires_in * 1000);
            localStorage.setItem('church_app_auth_token', response.access_token);
            localStorage.setItem('church_app_auth_expires', expiresAt.toString());
        }
    }

    clearAuthToken() {
        localStorage.removeItem('church_app_auth_token');
        localStorage.removeItem('church_app_auth_expires');
        localStorage.removeItem('church_app_user_info');
    }

    isTokenValid() {
        const token = localStorage.getItem('church_app_auth_token');
        const expiresAt = localStorage.getItem('church_app_auth_expires');
        
        if (!token || !expiresAt) {
            return false;
        }
        
        return Date.now() < parseInt(expiresAt);
    }

    async refreshTokenIfNeeded() {
        if (!this.isTokenValid()) {
            // With Google Identity Services, we need to request a new token
            try {
                await this.signIn();
                return true;
            } catch (error) {
                console.error('Token refresh failed:', error);
                return false;
            }
        }
        return true;
    }

    // Create authenticated fetch for API calls
    async authenticatedFetch(url, options = {}) {
        // Refresh token if needed
        await this.refreshTokenIfNeeded();
        
        const token = this.getAccessToken();
        if (!token) {
            throw new Error('No valid authentication token');
        }

        const authHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers: authHeaders
        });
    }
}

// Global OAuth manager instance
let oauthManager;

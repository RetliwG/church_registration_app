// OAuth Authentication Manager for Google Sheets API - Redirect-based flow for iOS compatibility
class OAuthManager {
    constructor() {
        this.accessToken = null;
        this.isInitialized = false;
        this.currentUser = null;
    }

    async initialize() {
        try {
            console.log('Initializing OAuth manager...');
            
            // Check if we're returning from OAuth redirect
            await this.handleOAuthRedirect();
            
            // Check if we have a stored valid token
            if (this.isTokenValid()) {
                this.accessToken = localStorage.getItem('church_app_auth_token');
                this.currentUser = { signedIn: true };
                console.log('Valid token found in storage');
            } else {
                console.log('No valid token found or token expired');
            }

            this.isInitialized = true;

        } catch (error) {
            console.error('Error initializing OAuth:', error);
            this.isInitialized = true; // Still mark as initialized
        }
    }

    async handleOAuthRedirect() {
        // Check if URL has OAuth response
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const expiresIn = urlParams.get('expires_in');
        const error = urlParams.get('error');

        if (error) {
            console.error('OAuth error from redirect:', error);
            // Clear the hash
            window.location.hash = '';
            throw new Error(error);
        }

        if (accessToken) {
            console.log('Access token received from redirect');
            this.accessToken = accessToken;
            
            // Store the token
            const expiresAt = Date.now() + (parseInt(expiresIn || '3600') * 1000);
            localStorage.setItem('church_app_auth_token', accessToken);
            localStorage.setItem('church_app_auth_expires', expiresAt.toString());
            
            this.currentUser = { signedIn: true };
            
            // Clear the hash from URL
            window.location.hash = '';
            
            return true;
        }
        
        return false;
    }

    async signIn() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log('Starting OAuth redirect flow...');
            
            // Build OAuth URL for redirect flow
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.append('client_id', CONFIG.GOOGLE_OAUTH_CLIENT_ID);
            authUrl.searchParams.append('redirect_uri', window.location.origin + window.location.pathname);
            authUrl.searchParams.append('response_type', 'token');
            authUrl.searchParams.append('scope', CONFIG.OAUTH_SCOPES);
            authUrl.searchParams.append('include_granted_scopes', 'true');
            authUrl.searchParams.append('state', 'signin');

            // Redirect to Google OAuth
            window.location.href = authUrl.toString();
            
            // Return a promise that never resolves (page will redirect)
            return new Promise(() => {});
            
        } catch (error) {
            console.error('Sign-in failed:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            if (this.accessToken) {
                // Revoke the token via Google's revoke endpoint
                await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                
                this.accessToken = null;
                this.currentUser = null;
                this.clearAuthToken();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Sign-out failed:', error);
            // Clear locally even if revoke fails
            this.accessToken = null;
            this.currentUser = null;
            this.clearAuthToken();
            return true;
        }
    }

    isSignedIn() {
        return !!this.accessToken && this.isTokenValid();
    }

    getAccessToken() {
        return this.accessToken;
    }

    getUserInfo() {
        // Get user info from stored data if available
        const storedInfo = localStorage.getItem('church_app_user_info');
        return storedInfo ? JSON.parse(storedInfo) : null;
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

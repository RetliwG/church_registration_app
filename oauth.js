// OAuth Authentication Manager for Google Sheets API
class OAuthManager {
    constructor() {
        this.authInstance = null;
        this.isInitialized = false;
        this.currentUser = null;
    }

    async initialize() {
        try {
            // Load Google API if not already loaded
            if (!window.gapi) {
                await this.loadGoogleAPI();
            }

            // Initialize OAuth
            await new Promise((resolve, reject) => {
                gapi.load('auth2', resolve);
            });

            this.authInstance = await gapi.auth2.init({
                client_id: CONFIG.GOOGLE_OAUTH_CLIENT_ID,
                scope: CONFIG.OAUTH_SCOPES
            });

            this.isInitialized = true;
            console.log('OAuth Manager initialized successfully');

            // Check if user is already signed in
            if (this.authInstance.isSignedIn.get()) {
                this.currentUser = this.authInstance.currentUser.get();
                this.storeAuthToken();
            }

        } catch (error) {
            console.error('Error initializing OAuth:', error);
            throw error;
        }
    }

    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async signIn() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            showLoading();
            this.currentUser = await this.authInstance.signIn();
            
            if (this.currentUser.isSignedIn()) {
                this.storeAuthToken();
                hideLoading();
                return true;
            }
            
            hideLoading();
            return false;
        } catch (error) {
            hideLoading();
            console.error('Sign-in failed:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            if (this.authInstance) {
                await this.authInstance.signOut();
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
        return this.authInstance && this.authInstance.isSignedIn.get();
    }

    getAccessToken() {
        if (this.currentUser && this.currentUser.isSignedIn()) {
            return this.currentUser.getAuthResponse().access_token;
        }
        return null;
    }

    getUserInfo() {
        if (this.currentUser && this.currentUser.isSignedIn()) {
            const profile = this.currentUser.getBasicProfile();
            return {
                id: profile.getId(),
                name: profile.getName(),
                email: profile.getEmail(),
                imageUrl: profile.getImageUrl()
            };
        }
        return null;
    }

    storeAuthToken() {
        if (this.currentUser) {
            const authResponse = this.currentUser.getAuthResponse();
            localStorage.setItem('church_app_auth_token', authResponse.access_token);
            localStorage.setItem('church_app_auth_expires', authResponse.expires_at.toString());
            
            const userInfo = this.getUserInfo();
            localStorage.setItem('church_app_user_info', JSON.stringify(userInfo));
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
        if (!this.isTokenValid() && this.isSignedIn()) {
            try {
                const user = this.authInstance.currentUser.get();
                await user.reloadAuthResponse();
                this.currentUser = user;
                this.storeAuthToken();
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

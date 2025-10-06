// Service Worker for offline functionality and background sync
const CACHE_NAME = 'church-registration-v1';
const OFFLINE_CACHE = 'church-registration-offline-v1';

// Files to cache for offline use
const STATIC_FILES = [
    '/church_registration_app/',
    '/church_registration_app/index.html',
    '/church_registration_app/config-setup.html',
    '/church_registration_app/styles.css',
    '/church_registration_app/app.js',
    '/church_registration_app/googleSheets.js',
    '/church_registration_app/config.js',
    '/church_registration_app/config-setup.js',
    '/church_registration_app/manifest.json'
];

// Install event - cache static files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Handle Google Sheets API requests specially
    if (request.url.includes('sheets.googleapis.com')) {
        event.respondWith(handleAPIRequest(request));
        return;
    }
    
    // Handle static file requests
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    // Return cached version if available
                    if (response) {
                        return response;
                    }
                    
                    // Otherwise fetch from network
                    return fetch(request)
                        .then(response => {
                            // Cache successful responses
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Return offline page if available
                            if (request.destination === 'document') {
                                return caches.match('/church_registration_app/index.html');
                            }
                        });
                })
        );
    }
});

// Handle API requests with offline fallback
async function handleAPIRequest(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        if (response.ok && request.method === 'GET') {
            // Only cache GET requests - PUT/POST requests cannot be cached
            const responseClone = response.clone();
            const cache = await caches.open(OFFLINE_CACHE);
            cache.put(request, responseClone);
        }
        
        return response;
    } catch (error) {
        // If network fails, try to serve from cache (only works for GET requests)
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // If no cache available, store request for later sync
        await storeOfflineRequest(request);
        
        // Return a custom offline response
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'Request stored for sync when online'
            }),
            {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Store failed requests for background sync
async function storeOfflineRequest(request) {
    try {
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text(),
            timestamp: Date.now()
        };
        
        // Store in IndexedDB for background sync
        const db = await openDB();
        const transaction = db.transaction(['pending_requests'], 'readwrite');
        const store = transaction.objectStore('pending_requests');
        await store.add(requestData);
        
    } catch (error) {
        console.error('Error storing offline request:', error);
    }
}

// Open IndexedDB for offline storage
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ChurchRegistrationDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('pending_requests')) {
                const store = db.createObjectStore('pending_requests', { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp');
            }
            
            if (!db.objectStoreNames.contains('offline_data')) {
                db.createObjectStore('offline_data', { keyPath: 'type' });
            }
        };
    });
}

// Background sync event
self.addEventListener('sync', event => {
    if (event.tag === 'church-registration-sync') {
        event.waitUntil(syncPendingRequests());
    }
});

// Sync pending requests when back online
async function syncPendingRequests() {
    try {
        const db = await openDB();
        const transaction = db.transaction(['pending_requests'], 'readwrite');
        const store = transaction.objectStore('pending_requests');
        const requests = await store.getAll();
        
        for (const requestData of requests) {
            try {
                const response = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body
                });
                
                if (response.ok) {
                    // Remove successfully synced request
                    await store.delete(requestData.id);
                }
            } catch (error) {
                console.error('Failed to sync request:', requestData.url, error);
            }
        }
        
        // Notify the main app that sync is complete
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                timestamp: Date.now()
            });
        });
        
    } catch (error) {
        console.error('Error during background sync:', error);
    }
}

// Listen for messages from the main app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

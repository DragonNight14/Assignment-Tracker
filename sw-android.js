// Android-Optimized Service Worker for Assignment Tracker PWA
const CACHE_NAME = 'assignment-tracker-android-v1';
const STATIC_CACHE = 'static-android-v1';
const DYNAMIC_CACHE = 'dynamic-android-v1';

// Core files for Android PWA
const ANDROID_CORE_FILES = [
    '/',
    '/index.html',
    '/create-assignment.html',
    '/create-assignment-enhanced.html',
    '/login.html',
    '/styles.css',
    '/settings.css',
    '/animations.css',
    '/script.js',
    '/enhanced-script.js',
    '/create-assignment.js',
    '/login.js',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Android-specific configuration
const ANDROID_CONFIG = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit for Android
    offlineTimeout: 3000, // 3 seconds before showing offline content
    enableBackgroundSync: true,
    enablePushNotifications: true,
    cacheStrategy: 'stale-while-revalidate' // Best for Android performance
};

// Install event - optimized for Android
self.addEventListener('install', event => {
    console.log('[Android SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Android SW] Caching core files');
                return cache.addAll(ANDROID_CORE_FILES);
            })
            .then(() => {
                console.log('[Android SW] Core files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Android SW] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Android SW] Activating...');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('[Android SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Fetch event - Android-optimized caching strategy
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }

    // Handle different types of requests
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigation(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

// Check if request is for static assets
function isStaticAsset(request) {
    return request.destination === 'image' || 
           request.destination === 'style' || 
           request.destination === 'script' ||
           request.url.includes('.css') ||
           request.url.includes('.js') ||
           request.url.includes('.png') ||
           request.url.includes('.jpg') ||
           request.url.includes('.svg');
}

// Check if request is navigation
function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[Android SW] Static asset fetch failed:', error);
        return new Response('Asset not available offline', { status: 503 });
    }
}

// Handle navigation with network-first, fallback to cache
async function handleNavigation(request) {
    try {
        const networkResponse = await Promise.race([
            fetch(request),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), ANDROID_CONFIG.offlineTimeout)
            )
        ]);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[Android SW] Navigation fetch failed, using cache:', error);
        const cachedResponse = await caches.match(request) || 
                              await caches.match('/index.html');
        return cachedResponse || new Response('App not available offline', { 
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Handle dynamic requests with stale-while-revalidate
async function handleDynamicRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}

// Android-optimized push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Assignment reminder!',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200], // Android-friendly vibration pattern
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 'assignment-notification'
        },
        actions: [
            {
                action: 'view',
                title: 'View Assignment',
                icon: '/icon-192x192.png'
            },
            {
                action: 'complete',
                title: 'Mark Complete',
                icon: '/icon-192x192.png'
            }
        ],
        requireInteraction: true,
        tag: 'assignment-reminder',
        // Android-specific options
        silent: false,
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification('Assignment Tracker', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const urlToOpen = event.action === 'view' ? '/' : 
                     event.action === 'complete' ? '/?action=complete' : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if app not open
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync for Android
self.addEventListener('sync', event => {
    if (event.tag === 'assignment-sync') {
        event.waitUntil(syncAssignments());
    }
});

// Sync assignments when back online
async function syncAssignments() {
    try {
        // Get pending assignments from IndexedDB or localStorage
        const pendingData = await getPendingSync();
        
        if (pendingData.length > 0) {
            console.log('[Android SW] Syncing', pendingData.length, 'assignments');
            
            for (const data of pendingData) {
                try {
                    await fetch('/api/assignments/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    await removePendingSync(data.id);
                } catch (error) {
                    console.log('[Android SW] Sync failed for item:', data.id);
                }
            }
        }
    } catch (error) {
        console.log('[Android SW] Background sync failed:', error);
    }
}

// Helper functions for sync data management
async function getPendingSync() {
    // Implementation would depend on your storage strategy
    return [];
}

async function removePendingSync(id) {
    // Implementation would depend on your storage strategy
    console.log('[Android SW] Removed synced item:', id);
}

// Android-specific cache management
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_MANAGEMENT') {
        switch (event.data.action) {
            case 'CLEAR_CACHE':
                event.waitUntil(clearAllCaches());
                break;
            case 'UPDATE_CACHE':
                event.waitUntil(updateCache());
                break;
        }
    }
});

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[Android SW] All caches cleared');
}

async function updateCache() {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(ANDROID_CORE_FILES);
    console.log('[Android SW] Cache updated');
}

console.log('[Android SW] Service Worker loaded and ready');

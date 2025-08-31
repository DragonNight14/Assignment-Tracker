// Service Worker for Assignment Tracker
const CACHE_NAME = 'assignment-tracker-v4';
const urlsToCache = [
    './',
    './index.html',
    './create-assignment.html',
    './login.html',
    './styles.css',
    './create-assignment.css',
    './login.css',
    './script.js',
    './create-assignment.js',
    './login.js',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png'
];

// Android-specific optimizations
const ANDROID_OPTIMIZATIONS = {
    // Enable background sync for offline functionality
    enableBackgroundSync: true,
    // Cache strategy for better performance
    cacheStrategy: 'cache-first',
    // Enable push notifications
    enablePushNotifications: true
};

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.log('Cache installation failed:', error);
            })
    );
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                // Clone the request because it's a stream
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response because it's a stream
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                }).catch(() => {
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

// Push event for notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Assignment reminder!',
        icon: './icon-192x192.png',
        badge: './icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        // Android-specific notification options
        actions: [
            {
                action: 'view',
                title: 'View Assignment',
                icon: './icon-192x192.png'
            },
            {
                action: 'complete',
                title: 'Mark Complete',
                icon: './icon-192x192.png'
            }
        ],
        requireInteraction: true,
        tag: 'assignment-reminder'
    };

    event.waitUntil(
        self.registration.showNotification('Assignment Tracker', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('./')
        );
    } else if (event.action === 'complete') {
        // Mark assignment as complete
        event.waitUntil(
            clients.openWindow('./?action=complete')
        );
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// Background sync for offline data
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    } else if (event.tag === 'assignment-sync') {
        event.waitUntil(syncAssignments());
    }
});

function doBackgroundSync() {
    // Sync any pending data when connection is restored
    return Promise.resolve();
}

function syncAssignments() {
    // Sync assignments when connection is restored
    return fetch('/api/assignments/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // Sync data here
        })
    }).catch(() => {
        // Handle offline case
        console.log('Background sync failed - will retry later');
    });
}

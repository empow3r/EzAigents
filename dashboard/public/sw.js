// Service Worker for Ez Aigent Dashboard PWA - Ultra Performance Optimized
const CACHE_VERSION = 'v3.0';
const CACHE_NAME = `ez-aigent-dashboard-${CACHE_VERSION}`;
const API_CACHE_NAME = `ez-aigent-api-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `ez-aigent-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `ez-aigent-dynamic-${CACHE_VERSION}`;

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg',
  '/logo-light.svg'
];

// API endpoints with different cache strategies
const API_ENDPOINTS = {
  REALTIME: ['/api/agents/status', '/api/queue/stats', '/api/metrics/live'],
  SHORT_CACHE: ['/api/agents', '/api/queue', '/api/projects'],
  LONG_CACHE: ['/api/config', '/api/capabilities', '/api/models']
};

// Cache durations
const CACHE_DURATIONS = {
  REALTIME: 5 * 1000,        // 5 seconds
  SHORT: 30 * 1000,          // 30 seconds  
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 60 * 60 * 1000,      // 1 hour
  STATIC: 24 * 60 * 60 * 1000 // 24 hours
};

// Image optimization settings
const IMAGE_FORMATS = ['webp', 'avif', 'png', 'jpg', 'jpeg', 'svg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy and TTL
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                // Store with timestamp for TTL
                const responseClone = response.clone();
                const cachedResponse = {
                  response: responseClone,
                  timestamp: Date.now()
                };
                cache.put(request, new Response(JSON.stringify(cachedResponse), {
                  headers: { 'Content-Type': 'application/json' }
                }));
              }
              return response;
            })
            .catch(() => {
              // Fallback to cached response if network fails
              return cache.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                  return cachedResponse.json().then((data) => {
                    // Check if cache is still valid
                    if (Date.now() - data.timestamp < API_CACHE_DURATION) {
                      return new Response(JSON.stringify(data.response), {
                        headers: { 'Content-Type': 'application/json' }
                      });
                    }
                    return null;
                  });
                }
                return null;
              });
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return fetch(request).then((response) => {
                if (response.ok) {
                  cache.put(request, response.clone());
                }
                return response;
              });
            });
        })
    );
    return;
  }

  // Default strategy - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline task queuing
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Sync pending tasks when back online
  const pendingTasks = await getStoredTasks();
  for (const task of pendingTasks) {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      await removeStoredTask(task.id);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icon-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Ez Aigent Dashboard', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for IndexedDB storage
async function getStoredTasks() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ez-aigent-tasks', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function removeStoredTask(taskId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ez-aigent-tasks', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const deleteRequest = store.delete(taskId);
      deleteRequest.onsuccess = () => resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
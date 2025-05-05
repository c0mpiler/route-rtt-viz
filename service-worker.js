/**
 * Service Worker for Route Radar
 *
 * This service worker provides efficient caching strategies for
 * the application, focusing on static assets and data files.
 */

// Cache name for version control
const CACHE_NAME = 'route-radar-cache-v1';

// App shell files to cache on install
const APP_SHELL_FILES = [
  '/route-rtt-viz/',
  '/route-rtt-viz/index.html',
  '/route-rtt-viz/assets/index.css',
  '/route-rtt-viz/assets/index.js'
];

// Data files to cache
const DATA_FILES = [
  '/route-rtt-viz/latency-data.json',
  '/route-rtt-viz/backup-latency-data.json',
  '/route-rtt-viz/coordinates-data.json',
  '/route-rtt-viz/continent-regions.json',
  '/route-rtt-viz/default-coordinates.json',
  '/route-rtt-viz/distant-regions.json',
  '/route-rtt-viz/essential-connections.json',
  '/route-rtt-viz/required-connections.json'
];

// Combined files to cache
const CACHE_FILES = [...APP_SHELL_FILES, ...DATA_FILES];

/**
 * Install event - precache app shell and data files
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Pre-cache files
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and data files');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('[Service Worker] Installation completed');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated and claiming clients');
        return self.clients.claim(); // Take control of clients immediately
      })
  );
});

/**
 * Fetch event - handle requests with appropriate caching strategies
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle data files with stale-while-revalidate strategy
  if (DATA_FILES.some(file => url.pathname.endsWith(file))) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  
  // Handle app shell files with cache-first strategy
  if (APP_SHELL_FILES.some(file => url.pathname.endsWith(file))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // For any data file with .json extension, use stale-while-revalidate
  if (url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  
  // Default to network-first for all other requests
  event.respondWith(networkFirst(event.request));
});

/**
 * Cache-first strategy: try cache, fallback to network, then cache
 */
function cacheFirst(request) {
  return caches.match(request)
    .then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Fallback to network
      return fetch(request).then((networkResponse) => {
        // Cache the response
        if (networkResponse.ok) {
          cacheResponse(request, networkResponse.clone());
        }
        
        return networkResponse;
      });
    });
}

/**
 * Network-first strategy: try network, fallback to cache
 */
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      // Cache the response
      if (response.ok) {
        cacheResponse(request, response.clone());
      }
      
      return response;
    })
    .catch(() => {
      // Fallback to cache
      return caches.match(request);
    });
}

/**
 * Stale-while-revalidate strategy: return cached version immediately,
 * then update the cache with a fresh version from the network
 */
function staleWhileRevalidate(request) {
  return caches.match(request)
    .then((cachedResponse) => {
      // Return cached response immediately if available
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            cacheResponse(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch((error) => {
          console.log('[Service Worker] Fetch failed:', error);
          // Return null to indicate network failure
          return null;
        });
      
      return cachedResponse || fetchPromise;
    });
}

/**
 * Helper function to cache a response
 */
function cacheResponse(request, response) {
  if (response.type === 'opaque') {
    // Don't cache opaque responses
    return Promise.resolve();
  }
  
  return caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, response));
}

/**
 * Message event - handle commands from the main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

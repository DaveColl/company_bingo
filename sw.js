const CACHE_NAME = 'kollegen-bingo-v7'; // Increment this version number when you update
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Install service worker and skip waiting
self.addEventListener('install', event => {
  console.log('Service Worker installing, version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating, version:', CACHE_NAME);
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
  // Take control of all pages immediately
  return self.clients.claim();
});

// Network-first strategy for HTML/JS/CSS, then cache fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // For HTML, CSS, JS files - always try network first
  if (url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' || 
      url.pathname.endsWith('/')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other files (images, etc.) - cache first
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

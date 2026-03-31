const CACHE_NAME = 'aareon-bingo-v4';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './aareon_logo_white.png',
    './img0_1024x768_NEU.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.map(name => { if (name !== CACHE_NAME) return caches.delete(name); })
            ))
            .then(() => self.clients.matchAll({ type: 'window' }))
            .then(clients => clients.forEach(client => client.navigate(client.url)))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isAppFile =
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js')   ||
        url.pathname.endsWith('.css')  ||
        url.pathname === '/'           ||
        url.pathname.endsWith('/');

    if (isAppFile) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});

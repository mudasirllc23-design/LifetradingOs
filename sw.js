// LifeTradingOS — Service Worker
// Enables offline use

const CACHE_NAME = 'lifeos-v1';
const ASSETS = [
  '/LifetradingOs/',
  '/LifetradingOs/index.html',
  '/LifetradingOs/css/style.css',
  '/LifetradingOs/js/storage.js',
  '/LifetradingOs/js/app.js',
  '/LifetradingOs/js/dashboard.js',
  '/LifetradingOs/js/habits.js',
  '/LifetradingOs/js/forex.js',
  '/LifetradingOs/js/goals.js',
  '/LifetradingOs/js/notes.js',
  '/LifetradingOs/js/analytics.js',
  '/LifetradingOs/js/reports.js',
  '/LifetradingOs/js/backup.js',
  '/LifetradingOs/js/rules.js',
  '/LifetradingOs/js/lock.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap'
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('Cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache new requests
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('/LifetradingOs/index.html');
      });
    })
  );
});

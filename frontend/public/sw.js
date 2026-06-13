const CACHE_NAME = 'fund-flow-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to ensure the app works online seamlessly
  // For a production PWA, you would cache static assets here.
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline mode not fully configured yet.');
    })
  );
});

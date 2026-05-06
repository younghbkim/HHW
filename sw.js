// My MTS - Service Worker
// Network-first for API, cache-first for app shell.

const CACHE_NAME = 'mymts-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(SHELL).catch(() => {/* ignore missing icons */}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Apps Script API 호출은 항상 네트워크 우선 (no-store)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":true,"message":"offline"}', {
      headers: { 'Content-Type': 'application/json' },
    })));
    return;
  }

  // 그 외는 캐시 우선 → 네트워크 폴백
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (e.request.method === 'GET' && res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});

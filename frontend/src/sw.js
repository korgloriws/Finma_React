// Simple Vite PWA service worker (cache-first for static assets)
const CACHE_NAME = 'finma-cache-v1'
const ASSETS = [
  '/',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  )
})



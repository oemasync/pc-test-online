// Service worker for pc-test-online (hand-written, no dependencies).
const PRECACHE_NAME = 'pc-test-online-precache-v7'
const RUNTIME_NAME = 'pc-test-online-runtime-v7'

const PRECACHE_ASSETS = "__PRECACHE_MANIFEST__"

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME)
      await cache.addAll(PRECACHE_ASSETS)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== PRECACHE_NAME && k !== RUNTIME_NAME)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isNavigation(request) {
  return request.mode === 'navigate'
}

function isMedia(request, url) {
  if (request.destination === 'video' || request.destination === 'audio') return true
  if (request.headers.has('range')) return true
  if (url.protocol === 'blob:' || url.protocol === 'mediastream:') return true
  return false
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache cross-origin requests or media streams: fall through to network.
  if (!isSameOrigin(url)) return
  if (isMedia(request, url)) return

  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request)
          const cache = await caches.open(RUNTIME_NAME)
          cache.put(request, network.clone())
          return network
        } catch {
          const cached = await caches.match(request, { ignoreVary: true })
          if (cached) return cached
          const precache = await caches.open(PRECACHE_NAME)
          const fallback = await precache.match('/index.html', { ignoreVary: true })
          return fallback || Response.error()
        }
      })(),
    )
    return
  }

  // Cache-first for hashed assets and other same-origin GETs.
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request, { ignoreVary: true })
        if (cached) return cached
        const network = await fetch(request)
        if (network && network.status === 200) {
          const cache = await caches.open(RUNTIME_NAME)
          cache.put(request, network.clone())
        }
        return network
      } catch {
        const cached = await caches.match(request, { ignoreVary: true })
        if (cached) return cached
        return Response.error()
      }
    })(),
  )
})
const root = self.registration.scope
const prefix = 'alisto-resident:' + root + ':'
const cacheName = prefix + '__VERSION__'
const assets = new Set(__ASSETS__.map(path => new URL(path, root).href))
const shell = new URL('index.html', root).href

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' })))))
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Auth callbacks may carry a one-time code. Always let the network handle those.
  if (url.search || url.origin !== self.location.origin) return
  const key = request.mode === 'navigate' && (url.href === root || url.href === shell) ? shell : url.href
  if (!assets.has(key)) return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    return await cache.match(key) || fetch(request)
  })())
})

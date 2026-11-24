// Only public basemap images requested by a visible map enter this cache.
const cacheName = 'alisto-osm-tiles-v1'
const limit = 384

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

function freshUntil(headers) {
  const policy = headers.get('cache-control') || ''
  if (/no-store|no-cache|private/i.test(policy)) return 0
  const date = Date.parse(headers.get('date') || '')
  const received = Date.parse(headers.get('x-alisto-cached-at') || '')
  const maxAge = policy.match(/(?:^|,)\s*max-age=(\d+)/i)
  if (maxAge) {
    const age = Number(headers.get('age') || 0) * 1000
    return Math.min(Number.isFinite(date) ? date : received, received - age) + Number(maxAge[1]) * 1000
  }
  return Date.parse(headers.get('expires') || '') || 0
}

async function tile(request) {
  let cache
  try {
    cache = await caches.open(cacheName)
    const hit = await cache.match(request)
    if (hit && freshUntil(hit.headers) > Date.now()) return hit
  } catch { /* Browser storage can be unavailable. */ }

  const response = await fetch(request)
  if (!cache || !response.ok || !response.headers.get('content-type')?.startsWith('image/')) return response
  const headers = new Headers(response.headers)
  headers.set('x-alisto-cached-at', new Date().toUTCString())
  if (freshUntil(headers) <= Date.now()) return response
  try {
    const keys = await cache.keys()
    if (keys.length >= limit) await Promise.all(keys.slice(0, keys.length - limit + 1).map(key => cache.delete(key)))
    await cache.put(request, new Response(response.clone().body, { headers }))
  } catch { /* Always return the downloaded tile even when the cache is full. */ }
  return response
}

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method === 'GET' && request.destination === 'image' && request.mode === 'cors' &&
      url.origin === 'https://tile.openstreetmap.org' && !url.search &&
      /^\/\d+\/\d+\/\d+\.png$/.test(url.pathname)) {
    event.respondWith(tile(request))
  }
})

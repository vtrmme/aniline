const CACHE_NAME = "aniline-shell-v1"

const PRECACHE = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

function shouldBypass(requestUrl) {
  if (requestUrl.origin !== self.location.origin) return true
  const p = requestUrl.pathname
  if (p.startsWith("/api/")) return true
  if (p.startsWith("/.well-known/")) return true
  if (p === "/sw.js" || p === "/manifest.webmanifest") return true
  if (/\.(m3u8|ts|m4s|mp4|webm|mkv|vtt|srt|ass)$/i.test(p)) return true
  return false
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (shouldBypass(url)) return

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot|css|js|mjs|map)$/i.test(
      url.pathname
    )

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(request)))
    return
  }

  if (!isStaticAsset) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
    })
  )
})

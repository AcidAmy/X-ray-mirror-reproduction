// Offline cache for X-Ray Mirror. The build stamps a fresh id into the cache name below, so every deploy starts a new cache
// and throws the old one away.
//   page (index.html): network first, cached copy when offline
//   everything else on this site (scripts, anatomy, tracker models, wasm): cached copy first, network otherwise
const CACHE = "xray-mirror-__BUILD__";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));

self.addEventListener("fetch", event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || req.headers.has("range")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const store = res => { if (res.ok && res.status === 200) cache.put(req, res.clone()); return res; };
    if (req.mode === "navigate") {
      try { return store(await fetch(req)); }
      catch (e) { return (await cache.match(req, { ignoreSearch: true })) || Response.error(); }
    }
    return (await cache.match(req)) || store(await fetch(req));
  })());
});

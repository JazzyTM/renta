// Офлайн-страница и кэш статики. Страницы и данные всегда берутся из сети.
const V = "bereg-1";
const OFFLINE = "/offline";
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll([OFFLINE, "/icon-192.png"]))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).catch(() => caches.match(OFFLINE))); return; }
  if (u.pathname.startsWith("/_next/static/") || /-t\.webp$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
  }
});

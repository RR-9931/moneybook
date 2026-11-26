// 我的钱簿 service worker — network first (always newest when online), cache fallback (works offline)
const CACHE = "moneybook-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$|^cdn\.jsdelivr\.net$/.test(url.hostname);
  if (!same && !font) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (font) { const hit = await c.match(req); if (hit) return hit; try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; } catch (err) { return hit || Response.error(); } }
    try {
      const r = await Promise.race([fetch(req, { cache: "no-cache" }), new Promise((_, rej) => setTimeout(() => rej("timeout"), 4000))]);
      if (r.ok) c.put(req.mode === "navigate" ? "index.html" : req, r.clone());
      return r;
    } catch (err) {
      return (await c.match(req.mode === "navigate" ? "index.html" : req)) || (await c.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});

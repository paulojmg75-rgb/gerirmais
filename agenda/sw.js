/* gerirmais — service worker: usa sempre a versão mais recente do site (incluindo ícones e manifest,
   para o ícone instalado no PC/telemóvel se atualizar sozinho) e guarda uma cópia para abrir sem internet. */
const CACHE = "agenda-gm2";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("agenda") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  /* páginas, manifest e ícones: pede sempre ao servidor uma versão confirmada (sem usar a cópia velha do navegador) */
  const fresh = req.mode === "navigate" || /\.(html|webmanifest|png|js)$/.test(url.pathname) || url.pathname.endsWith("/");
  e.respondWith(
    fetch(req, fresh ? { cache: "no-cache" } : undefined).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./")))
  );
});
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){ if(l[i].url.indexOf("/agenda/")>-1 && "focus" in l[i]) return l[i].focus(); }
    return self.clients.openWindow("./");
  }));
});
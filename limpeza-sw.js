/* Limpezas — Gestão AL: guarda a página para abrir depressa (e mesmo com rede fraca).
   Os dados vêm sempre da internet; só a "casca" da página fica guardada. */
const CACHE = 'limpezas-v2';
const CASCA = ['/limpeza.html', '/limpeza.webmanifest', '/limpeza-192.png', '/limpeza-512.png', '/limpeza-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CASCA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('limpezas-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !CASCA.includes(u.pathname)) return;
  // rede primeiro (para receber sempre a versão nova); sem rede, usa a cópia guardada
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(u.pathname, c)); }
      return r;
    }).catch(() => caches.match(u.pathname))
  );
});

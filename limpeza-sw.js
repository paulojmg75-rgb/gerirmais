/* Limpezas — Gestão AL: guarda a página para abrir depressa (e mesmo com rede fraca).
   Os dados vêm sempre da internet; só a "casca" da página fica guardada. */
const CACHE = 'limpezas-v3';
const CASCA = ['/limpeza.html', '/limpeza.webmanifest', '/limpeza-192.png', '/limpeza-512.png', '/limpeza-180.png', '/limpeza-badge.png'];

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

/* Avisos de limpeza: notificação + número no ícone; ao tocar abre a página com o aviso */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { corpo: e.data ? e.data.text() : '' }; }
  const t = [self.registration.showNotification(d.titulo || '🧹 Limpezas', {
    body: d.corpo || 'Tem uma limpeza marcada.',
    icon: '/limpeza-192.png', badge: '/limpeza-badge.png',
    tag: d.tag || 'limpeza', renotify: true, requireInteraction: false,
    data: { url: d.url || '/limpeza.html?aviso=1' }
  })];
  if (self.navigator && self.navigator.setAppBadge) t.push(self.navigator.setAppBadge(d.n || 1).catch(() => {}));
  e.waitUntil(Promise.all(t));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const rel = (e.notification.data && e.notification.data.url) || '/limpeza.html?aviso=1';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) {
      if (new URL(c.url).pathname.startsWith('/limpeza')) {
        const u = new URL(c.url); u.searchParams.set('aviso', '1');   // mantém o link (?c=…) da pessoa
        return c.navigate(u.href).then(w => (w || c).focus()).catch(() => c.focus());
      }
    }
    return self.clients.openWindow(rel);
  }));
});

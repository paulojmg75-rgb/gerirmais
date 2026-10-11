// Agenda do Professor: service worker mínimo, só para mostrar avisos (não guarda nada em cache)
self.addEventListener("install", function(e){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){ if(l[i].url.indexOf("/agenda/")>-1 && "focus" in l[i]) return l[i].focus(); }
    return self.clients.openWindow("./");
  }));
});

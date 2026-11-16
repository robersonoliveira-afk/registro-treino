// Service worker: guarda o app no aparelho para funcionar offline.
// Ao publicar uma nova versão do index.html, mude o número abaixo.
const VERSAO = 'registro-treino-1.1.0';
const CACHE_FONTES = 'registro-treino-fontes';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO && n !== CACHE_FONTES).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes do Google: usa a cópia guardada e atualiza em segundo plano
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith(caches.open(CACHE_FONTES).then(async cache => {
      const guardada = await cache.match(req);
      const rede = fetch(req).then(resp => { if (resp.ok || resp.type === 'opaque') cache.put(req, resp.clone()); return resp; }).catch(() => guardada);
      return guardada || rede;
    }));
    return;
  }

  // Arquivos do app: primeiro o que está guardado; páginas caem no index.html
  if (url.origin === self.location.origin) {
    ev.respondWith(
      caches.match(req, { ignoreSearch: true }).then(guardada => {
        if (guardada) return guardada;
        return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      })
    );
  }
});

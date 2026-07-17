const CACHE_NAME = 'giardino-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// All'installazione, mettiamo in cache l'interfaccia base dell'app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Puliamo le cache vecchie quando si attiva una nuova versione
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomi) =>
      Promise.all(
        nomi.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Strategia: solo per richieste dello stesso dominio (l'interfaccia dell'app).
// Le chiamate a Supabase, font e CDN restano sempre in rete: i dati devono
// essere sempre aggiornati, l'app funziona offline solo per aprirsi e
// mostrare l'ultima interfaccia caricata.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const stessaOrigine = url.origin === self.location.origin;

  if (!stessaOrigine || event.request.method !== 'GET') {
    return; // lascia passare alla rete normalmente
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((risposta) => {
          if (risposta && risposta.status === 200) {
            const clone = risposta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return risposta;
        })
        .catch(() => cached); // offline: usa la cache se la rete fallisce

      return cached || fetchPromise;
    })
  );
});

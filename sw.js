/* ============================================================
   Where's my money? — guardián sin conexión
   ============================================================
   Este archivo hace que la app ABRA sin internet. Nada más.
   No guarda gastos ni los manda después: de eso siguen
   encargándose los atajos, que para eso tienen su propia cola.

   Qué guarda: el armazón de la app (la página, config.js, el
   manifest, los iconos). Los datos —tus movimientos, tus
   tarjetas— los guarda la app aparte, en el teléfono, y los
   pinta con un aviso de cuándo se actualizaron por última vez.

   REGLA QUE NO SE ROMPE: primero la red, el guardado solo si
   la red falla. Si fuera al revés, el día que subas un
   index.html nuevo a GitHub el teléfono seguiría enseñando el
   viejo para siempre y no habría forma de sacarlo de ahí.
   ============================================================ */

const CACHE = 'wmm-v1';

const ARMAZON = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './iconos/icono-192.png',
  './iconos/icono-180.png',
  './iconos/favicon-32.png',
  './iconos/carga-signos.png',
  './iconos/carga-moneda.png',
  './iconos/carga-cerdo.png'
];

self.addEventListener('install', function (ev) {
  // Uno por uno y sin rendirse: si un icono falla, que no se caiga
  // la instalación entera y nos quedemos sin nada guardado.
  ev.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ARMAZON.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  const req = ev.request;

  // Solo lo de esta misma dirección y solo lecturas. Las llamadas al
  // servidor de Google son POST y de otro dominio: esas pasan de largo,
  // sin tocarlas. Si las interceptáramos, un gasto podría "guardarse"
  // contra una copia vieja y nunca llegar a la hoja.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  ev.respondWith(
    fetch(req).then(function (r) {
      // Guarda la copia buena para la próxima vez que no haya internet.
      if (r && r.ok && r.type === 'basic') {
        const copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return r;
    }).catch(function () {
      return caches.match(req).then(function (guardado) {
        if (guardado) return guardado;
        // Si piden una página que no tenemos, al menos la de inicio.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

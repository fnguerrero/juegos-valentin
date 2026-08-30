/* Service worker: deja la app usable sin internet una vez abierta.
   - El HTML va por red primero, así una versión nueva llega apenas se publica.
   - Los sonidos e íconos van por caché primero: no cambian y así cargan al toque. */
const CACHE = "valen-v2";  // subir esto cada vez que cambie un sonido o un icono
const ESTATICOS = [
  "./", "./index.html", "./manifest.json",
  "./icono-192.png", "./icono-512.png", "./apple-touch-icon.png",
  "./sonidos/vaca.mp3", "./sonidos/perro.mp3", "./sonidos/gato.mp3",
  "./sonidos/chancho.mp3", "./sonidos/gallina.mp3", "./sonidos/caballo.mp3",
  "./sonidos/rana.mp3", "./sonidos/leon.mp3", "./sonidos/oveja.mp3"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ESTATICOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;

  const esPagina = req.mode === "navigate" || req.destination === "document";

  if (esPagina) {
    // red primero, con la copia guardada como respaldo si no hay señal
    ev.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copia));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  ev.respondWith(
    caches.match(req).then(guardado => guardado || fetch(req).then(res => {
      if (res.ok && new URL(req.url).origin === location.origin) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return res;
    }).catch(() => guardado || Response.error()))
  );
});

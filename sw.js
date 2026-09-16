/* Service worker: deja la app usable sin internet una vez abierta.
   - El HTML va por red primero, así una versión nueva llega apenas se publica.
   - Los sonidos e íconos van por caché primero: no cambian y así cargan al toque. */
const CACHE = "valen-v11";  // subir esto cada vez que cambie un sonido o un icono
const ESTATICOS = [
  "./", "./manifest.json",
  "./fuentes/baloo2-700.woff2", "./fuentes/baloo2-800.woff2",
  "./icono-192.png", "./icono-512.png", "./apple-touch-icon.png",
  "./sonidos/vaca.mp3", "./sonidos/perro.mp3", "./sonidos/gato.mp3",
  "./sonidos/chancho.mp3", "./sonidos/gallina.mp3", "./sonidos/caballo.mp3",
  "./sonidos/rana.mp3", "./sonidos/leon.mp3", "./sonidos/oveja.mp3"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ESTATICOS.map(u =>
        fetch(u, { cache: "reload" }).then(limpia).then(r => r.ok && c.put(u, r))
      )))
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

// Algunos hostings (Cloudflare) redirigen /index.html a /. Chrome rechaza una
// respuesta redirigida para abrir una página (ERR_FAILED), así que se copia
// en una respuesta nueva, sin la marca de redirección.
function limpia(res) {
  if (!res.redirected) return res;
  return res.blob().then(cuerpo => new Response(cuerpo, {
    status: res.status, statusText: res.statusText, headers: res.headers
  }));
}

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;

  const esPagina = req.mode === "navigate" || req.destination === "document";

  if (esPagina) {
    // red primero y SIN la caché del navegador: si no, sigue sirviendo la
    // versión vieja del HTML aunque ya haya una publicada.
    ev.respondWith(
      fetch(req.url, { cache: "reload", credentials: "same-origin" })
        .then(limpia)
        .then(res => {
          caches.open(CACHE).then(c => c.put("./", res.clone()));
          return res;
        })
        .catch(() => caches.match("./"))
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

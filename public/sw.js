/* Service worker de Buscádetodo: permite instalar el sitio como app.
 *
 * Regla principal: que nadie quede con una versión vieja después de un deploy.
 *  - Páginas (index.html): primero la red; la copia guardada solo se usa sin
 *    conexión. Así cada deploy se ve en la próxima carga.
 *  - /static/ (JS, CSS e imágenes con un código en el nombre que cambia en
 *    cada build): de la caché si está, si no de la red. Un archivo con ese
 *    nombre nunca cambia de contenido, así que no puede quedar viejo.
 *  - Todo lo demás (la API, que está en otro dominio, Google Fonts, íconos):
 *    no se toca, el navegador lo maneja como siempre.
 *
 * Para forzar que todos borren lo guardado, cambiar VERSION.
 * nginx sirve este archivo con Cache-Control: no-cache (ver nginx.conf).
 */
const VERSION = 'v1';
const CACHE_PAGINAS = `buscadetodo-paginas-${VERSION}`;
const CACHE_ESTATICOS = `buscadetodo-estaticos-${VERSION}`;
const MAX_ESTATICOS = 80; // los builds viejos se van borrando

self.addEventListener('install', (event) => {
  // Guardar la página de inicio para poder abrir la app sin conexión
  event.waitUntil(
    caches
      .open(CACHE_PAGINAS)
      .then((cache) => cache.add(new Request('/', { cache: 'reload' })))
      .catch(() => {}) // sin conexión al instalar: se guarda en la primera visita
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((n) => n.startsWith('buscadetodo-') && n !== CACHE_PAGINAS && n !== CACHE_ESTATICOS)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

const recortar = async (nombreCache, maximo) => {
  const cache = await caches.open(nombreCache);
  const claves = await cache.keys();
  await Promise.all(claves.slice(0, Math.max(0, claves.length - maximo)).map((k) => cache.delete(k)));
};

const SIN_CONEXION = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión | Buscádetodo</title>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0b2346;text-align:center;padding:0 16px">
<p style="margin:0;font-size:1.3rem;font-weight:700">No hay conexión</p>
<p style="margin:0;color:#5f6b7a">Revisá tu internet y volvé a intentar.</p>
<button onclick="location.reload()" style="margin-top:8px;padding:10px 20px;border:0;border-radius:6px;background:#0b6cf0;color:#fff;font:inherit;font-weight:600">Reintentar</button>
</body></html>`;

async function pagina(request) {
  const cache = await caches.open(CACHE_PAGINAS);
  try {
    const respuesta = await fetch(request);
    // Todas las rutas de la app devuelven el mismo index.html: se guarda una sola copia
    if (respuesta.ok) cache.put('/', respuesta.clone());
    return respuesta;
  } catch {
    const guardada = await cache.match('/');
    return guardada || new Response(SIN_CONEXION, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function estatico(request) {
  const cache = await caches.open(CACHE_ESTATICOS);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) {
    await cache.put(request, respuesta.clone());
    recortar(CACHE_ESTATICOS, MAX_ESTATICOS);
  }
  return respuesta;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API, fuentes: como siempre

  if (request.mode === 'navigate') {
    event.respondWith(pagina(request));
  } else if (url.pathname.startsWith('/static/')) {
    event.respondWith(estatico(request));
  }
});

/* =========================================================
   LUMA — Service Worker
   Estrategias de caché:
     A) CACHE FIRST            -> CSS, JS, fuentes, logo e iconos (luma-static-v1)
     B) NETWORK FIRST          -> peticiones a la API  /api/…      (luma-api-v1)
     C) STALE WHILE REVALIDATE -> fotografías de las plantas       (luma-images-v1)
     D) OFFLINE FALLBACK       -> offline.html si una página no está disponible
     E) VERSIONADO             -> al activar se borran las cachés luma-* antiguas
     F) LÍMITES Y SEGURIDAD    -> ver comentarios más abajo
   Todas las rutas son relativas al alcance (scope) del Service Worker.
   ========================================================= */
'use strict';

const VERSION = 'v7-3d-all';                       // súbela (v2, v3…) cuando cambies archivos estáticos
const CACHE_STATIC = 'luma-static-' + VERSION;
const CACHE_IMAGES = 'luma-images-' + VERSION;
const CACHE_API = 'luma-api-' + VERSION;
const CURRENT = [CACHE_STATIC, CACHE_IMAGES, CACHE_API];

const MAX_IMAGES = 120;                     // límite de imágenes guardadas (evita crecimiento ilimitado)
const MAX_API = 10;                         // límite de respuestas de API guardadas
const API_TIMEOUT_MS = 3500;                // Network First: espera máxima de la red antes de usar la caché
const API_PATH = 'api/';                    // prefijo (relativo al scope) tratado como API

const SCOPE = new URL(self.registration.scope);
const abs = (p) => new URL(p, SCOPE).href;

const PAGES = ['index', 'login', 'registro', 'admin', 'productos', 'producto', 'carrito', 'favoritos', 'perfil', 'pedidos', 'ticket', 'visor', 'resumen', 'inventario', 'clientes', 'opiniones', 'offline'].map((n) => n + '.html');
const STATIC_ASSETS = ['./', ...PAGES, 'style.css', 'app.js', 'js/data.js', 'js/store.js', 'js/ui.js', 'js/mail.js', 'js/admin.js', 'site.webmanifest', 'img/plantas/pothos/Pothos_LUMA_3D.glb', 'img/plantas/zamioculca/zamioculca_LUMA_3D.glb','img/plantas/alocasia/alocasia_LUMA_3D.glb','img/plantas/calathea/calathea_LUMA_3D.glb','img/plantas/dracaena-marginata/dracaena-marginata_LUMA_3D.glb','img/plantas/ficus-elastica/ficus-elastica_LUMA_3D.glb','img/plantas/ficus-lyrata/ficus-lyrata_LUMA_3D.glb','img/plantas/sansevieria/sansevieria_LUMA_3D.glb','img/plantas/monstera/monstera_LUMA_3D.glb','img/plantas/philodendron/philodendron_LUMA_3D.glb',
  'fonts/Poppins-Regular.woff', 'fonts/Poppins-Medium.woff', 'fonts/Poppins-Bold.woff', 'fonts/Lora-Variable.woff', 'fonts/Lora-Italic-Variable.woff',
  'img/luma-logo.png', 'img/luma-logo-horizontal.png', 'img/luma-isotipo.png', 'img/icon-48.png', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-512.png', 'img/apple-touch-icon.png'];
const SLUGS = ['monstera', 'sansevieria', 'pothos', 'zamioculca', 'ficus-lyrata', 'dracaena-marginata', 'philodendron', 'calathea', 'ficus-elastica', 'alocasia'];
const VISTAS = ['principal', 'superior', 'lateral', 'hoja', 'base', 'miniatura'];
const PLANT_IMAGES = SLUGS.flatMap((s) => VISTAS.map((v) => 'img/plantas/' + s + '/' + s + '-' + v + '.webp'));

/* ---------- Instalación: precarga del “app shell” y de las fotografías ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const st = await caches.open(CACHE_STATIC);
    // El app shell debe guardarse completo para que la app abra sin conexión.
    await Promise.all(STATIC_ASSETS.map((u) => st.add(new Request(abs(u), { cache: 'reload' }))));
    // Las fotos se guardan una a una: si alguna falla, la instalación no se cancela.
    const im = await caches.open(CACHE_IMAGES);
    await Promise.allSettled(PLANT_IMAGES.map((u) => im.add(new Request(abs(u), { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

/* ---------- Activación: borrar cachés antiguas (versionado) ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('luma-') && !CURRENT.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

/* ---------- Utilidades ---------- */
const cacheable = (res) => res && res.status === 200 && (res.type === 'basic' || res.type === 'default'); // nunca guardar errores HTTP ni respuestas opacas

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

const timeoutFetch = (request, ms) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(request, { signal: ctl.signal }).finally(() => clearTimeout(t));
};

/* A) CACHE FIRST: primero la caché; si no existe, la red (y se guarda). */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) cache.put(request, res.clone());
  return res;
}

/* B) NETWORK FIRST (API): 1) intenta la red con tiempo máximo; 2) si responde bien, guarda una copia;
      3) si falla o tarda demasiado, devuelve la última copia guardada marcada con X-LUMA-Source: cache;
      4) si no hay copia, devuelve un error JSON controlado (503) en lugar de romper la app. */
async function networkFirst(request, event) {
  const cache = await caches.open(CACHE_API);
  const key = new Request(request.url.split('#')[0]);          // misma clave aunque cambien las cabeceras
  try {
    const res = await timeoutFetch(request, API_TIMEOUT_MS);
    if (cacheable(res)) {
      event.waitUntil(cache.put(key, res.clone()).then(() => trim(CACHE_API, MAX_API)));
    }
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set('X-LUMA-Source', 'cache');
      return new Response(await hit.blob(), { status: 200, statusText: 'OK (cache)', headers });
    }
    return new Response(JSON.stringify({ error: 'offline', mensaje: 'Sin conexión y sin copia guardada de la API.' }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-LUMA-Source': 'none' } });
  }
}

/* C) STALE WHILE REVALIDATE (fotografías): responde al instante con la copia guardada
      y, en segundo plano, descarga la versión nueva (event.waitUntil mantiene viva la tarea). */
async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_IMAGES);
  const hit = await cache.match(request);
  const update = fetch(request).then(async (res) => {
    if (cacheable(res)) { await cache.put(request, res.clone()); await trim(CACHE_IMAGES, MAX_IMAGES); }
    return res;
  }).catch(() => null);
  if (hit) { event.waitUntil(update); return hit; }
  const res = await update;
  return res || Response.error();
}

/* D) NAVEGACIÓN + OFFLINE FALLBACK: red primero (para recibir cambios), caché si no hay conexión,
      y offline.html como último recurso. Se guarda sin query string (producto.html?id=… usa producto.html). */
async function navigation(request, event) {
  const cache = await caches.open(CACHE_STATIC);
  const clean = new URL(request.url); clean.search = ''; clean.hash = '';
  try {
    const res = await timeoutFetch(request, 4000);
    if (cacheable(res)) event.waitUntil(cache.put(clean.href, res.clone()));
    return res;
  } catch (err) {
    return (await cache.match(clean.href)) || (await cache.match(request, { ignoreSearch: true })) || (await cache.match(abs('offline.html'))) || Response.error();
  }
}

/* ---------- Enrutador de peticiones ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                              // F) nunca cachear escrituras (POST, PUT, DELETE…)
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                    // F) no interceptar otros dominios
  if (req.headers.has('range') || req.headers.has('authorization')) return; // F) ni medios parciales ni peticiones autenticadas
  const rel = url.pathname.slice(SCOPE.pathname.length);         // ruta relativa al scope
  if (/(^|\/)(auth|login-api|session|token)(\/|$)/i.test(rel)) return;     // F) nunca cachear autenticación

  if (rel.startsWith(API_PATH)) { event.respondWith(networkFirst(req, event)); return; }          // B
  if (req.mode === 'navigate') { event.respondWith(navigation(req, event)); return; }              // D
  if (rel.startsWith('img/plantas/')) { event.respondWith(staleWhileRevalidate(req, event)); return; } // C
  if (/\.(css|js|woff2?|png|svg|ico|webmanifest)$/i.test(rel)) { event.respondWith(cacheFirst(req)); return; } // A
  // Cualquier otra URL: no se intercepta (F: no interceptar indiscriminadamente).
});

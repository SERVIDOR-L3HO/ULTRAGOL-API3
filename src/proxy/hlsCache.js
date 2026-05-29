/**
 * HLS PROXY CON CACHÉ INTELIGENTE
 * =================================
 * - Segmentos .ts: se descargan UNA SOLA VEZ y se sirven a todos los usuarios desde memoria
 * - Playlists .m3u8: se cachean 3 segundos (las listas se actualizan rápido en vivo)
 * - Deduplicación: si 50 usuarios piden el mismo segmento simultáneo, solo 1 petición al origen
 * - Limpieza automática: la memoria se libera automáticamente para no llenarse
 */

const axios = require('axios');

// ── Caché de segmentos .ts (inmutables, se cachean 90 segundos) ──────────────
const segmentCache = new Map();
const SEG_TTL = 90 * 1000; // 90 segundos
const SEG_MAX = 500;        // máximo 500 segmentos en memoria

// ── Caché de playlists .m3u8 (se actualizan cada ~2-6s en vivo) ─────────────
const playlistCache = new Map();
const PLAYLIST_TTL = 3 * 1000; // 3 segundos

// ── Peticiones en vuelo (deduplicación) ─────────────────────────────────────
const inFlight = new Map();

/**
 * Limpia entradas expiradas de la caché de segmentos
 */
function evictSegments() {
  const now = Date.now();
  for (const [key, entry] of segmentCache) {
    if (now - entry.ts > SEG_TTL) {
      segmentCache.delete(key);
    }
  }
  // Si aún hay demasiados, eliminar los más viejos
  if (segmentCache.size > SEG_MAX) {
    const sorted = [...segmentCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    const toRemove = sorted.slice(0, segmentCache.size - SEG_MAX);
    for (const [k] of toRemove) segmentCache.delete(k);
  }
}

// Limpieza automática cada 30 segundos
setInterval(evictSegments, 30 * 1000);

/**
 * Obtiene un segmento .ts con caché y deduplicación.
 * Si 10 usuarios lo piden al mismo tiempo, solo 1 petición al origen.
 */
async function fetchSegment(url, headers = {}) {
  const now = Date.now();

  // 1. Buscar en caché
  const cached = segmentCache.get(url);
  if (cached && now - cached.ts < SEG_TTL) {
    return { data: cached.data, contentType: cached.contentType, fromCache: true };
  }

  // 2. Deduplicación: si ya hay una petición en vuelo, esperar a que termine
  if (inFlight.has(url)) {
    return inFlight.get(url);
  }

  // 3. Hacer la petición al origen
  const promise = axios.get(url, {
    timeout: 20000,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers
    }
  }).then(resp => {
    const contentType = resp.headers['content-type'] || 'video/MP2T';
    const entry = { data: resp.data, contentType, ts: Date.now() };
    segmentCache.set(url, entry);
    inFlight.delete(url);
    return { data: resp.data, contentType, fromCache: false };
  }).catch(err => {
    inFlight.delete(url);
    throw err;
  });

  inFlight.set(url, promise);
  return promise;
}

/**
 * Obtiene una playlist .m3u8 con caché de 3 segundos.
 * Sigue siendo live porque el reproductor la pide cada pocos segundos.
 */
async function fetchPlaylist(url, headers = {}) {
  const now = Date.now();

  const cached = playlistCache.get(url);
  if (cached && now - cached.ts < PLAYLIST_TTL) {
    return { data: cached.data, fromCache: true };
  }

  const resp = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers
    }
  });

  playlistCache.set(url, { data: resp.data, ts: Date.now() });
  return { data: resp.data, fromCache: false };
}

/**
 * Resuelve una URL relativa contra una base
 */
function resolveUrl(line, base) {
  if (!line || line.startsWith('http')) return line;
  if (line.startsWith('//')) return 'https:' + line;
  if (line.startsWith('/')) {
    try { return new URL(base).origin + line; } catch { return line; }
  }
  const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
  return baseDir + line;
}

/**
 * Reescribe el contenido de una playlist .m3u8 para que
 * todos los segmentos pasen por nuestro proxy con caché
 */
function rewritePlaylist(content, originalUrl, serverBase, referer = '') {
  const refParam = referer ? `&ref=${encodeURIComponent(referer)}` : '';

  // Reescribir segmentos .ts y archivos binarios de segmento
  content = content.replace(/^((?!#).+\.ts(?:[?&][^\s]*)?)$/gm, line => {
    const abs = resolveUrl(line.trim(), originalUrl);
    return `${serverBase}/hls-cache-seg?url=${encodeURIComponent(abs)}${refParam}`;
  });

  // Reescribir sub-playlists .m3u8 (calidad múltiple)
  content = content.replace(/^((?!#)(?!.+\/hls-cache).+\.m3u8[^\s]*)$/gm, line => {
    const abs = resolveUrl(line.trim(), originalUrl);
    return `${serverBase}/hls-cache?url=${encodeURIComponent(abs)}${refParam}`;
  });

  // Reescribir URIs de claves de cifrado (#EXT-X-KEY URI="...")
  content = content.replace(/URI="([^"]+)"/g, (match, uri) => {
    const abs = resolveUrl(uri, originalUrl);
    return `URI="${serverBase}/hls-cache-seg?url=${encodeURIComponent(abs)}${refParam}"`;
  });

  return content;
}

/**
 * Estadísticas de caché para monitoreo
 */
function getCacheStats() {
  return {
    segmentos_en_cache: segmentCache.size,
    playlists_en_cache: playlistCache.size,
    peticiones_en_vuelo: inFlight.size,
    max_segmentos: SEG_MAX
  };
}

module.exports = {
  fetchSegment,
  fetchPlaylist,
  rewritePlaylist,
  getCacheStats
};

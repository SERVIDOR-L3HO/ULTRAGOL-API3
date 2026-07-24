const axios = require('axios');

const AUTH_URL = 'https://auth.a7xtv.com/api/auth/guest';
const API_URL  = 'https://api.a7xtv.com/api/iptv';

// ─── Token de invitado (se cachea hasta que venza) ─────────────────────────
let _token      = null;
let _tokenExpAt = 0;

async function getGuestToken() {
  const now = Date.now();
  if (_token && _tokenExpAt > now + 60_000) return _token;

  const res = await axios.post(AUTH_URL, {}, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
  });

  _token      = res.data.accessToken;
  _tokenExpAt = res.data.expiresAt || (now + 24 * 3600 * 1000);
  console.log('[a7xtv] Nuevo token de invitado obtenido');
  return _token;
}

// ─── Llamada genérica a la API ─────────────────────────────────────────────
async function apiCall(operation, params = {}) {
  const token = await getGuestToken();
  const res = await axios.post(
    API_URL,
    { operation, ...params },
    {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 15_000,
    }
  );
  return res.data;
}

// ─── Caché de URLs de stream (expiran con la firma del servidor) ───────────
const streamCache = new Map();

async function getStreamUrl(id, type = 'vod', extension = null, forceRefresh = false) {
  const ext      = extension || (type === 'series' ? 'mkv' : 'mp4');
  const cacheKey = `stream_${type}_${id}_${ext}`;
  const cached   = streamCache.get(cacheKey);

  // Reusar si el URL no vence en los próximos 5 minutos
  if (cached && !forceRefresh && Date.now() < cached.expiresAt - 300_000) {
    return cached.data;
  }

  const data = await apiCall('playback_urls', {
    type,
    id,
    extension: ext,
    purpose: 'web_mobile',
    client:  'a7x-web-mobile-v1',
  });

  if (data.error) throw new Error(data.error);

  const result = {
    id,
    type,
    extension: ext,
    url:        data.url,
    mirrorUrls: data.mirrorUrls || [],
    expires:    data.expires,
    source:     data.source,
    delivery:   data.delivery,
  };

  const expiresAt = data.expires ? data.expires * 1000 : Date.now() + 2 * 3600 * 1000;
  streamCache.set(cacheKey, { data: result, expiresAt });
  return result;
}

// ─── Caché de catálogo / metadatos (TTL largo) ────────────────────────────
const catalogCache = new Map();
const CATALOG_TTL  = 2 * 3600 * 1000; // 2 horas

async function getCatalog(forceRefresh = false) {
  const cached = catalogCache.get('home');
  if (cached && !forceRefresh && Date.now() - cached.ts < CATALOG_TTL) return cached.data;

  const data = await apiCall('tmdb_home');
  if (data.error) throw new Error(data.error);

  catalogCache.set('home', { data, ts: Date.now() });
  return data;
}

async function getCategories(type = 'vod', forceRefresh = false) {
  const key    = `cats_${type}`;
  const cached = catalogCache.get(key);
  if (cached && !forceRefresh && Date.now() - cached.ts < CATALOG_TTL) return cached.data;

  const data = await apiCall('categories', { type });
  if (data.error) throw new Error(data.error);

  catalogCache.set(key, { data, ts: Date.now() });
  return data;
}

async function getStreams(type = 'vod', categoryId, forceRefresh = false) {
  const key    = `streams_${type}_${categoryId}`;
  const cached = catalogCache.get(key);
  if (cached && !forceRefresh && Date.now() - cached.ts < CATALOG_TTL) return cached.data;

  const data = await apiCall('streams', { type, category_id: categoryId });
  if (data.error) throw new Error(data.error);

  catalogCache.set(key, { data, ts: Date.now() });
  return data;
}

async function getSeriesInfo(seriesId, forceRefresh = false) {
  const key    = `series_${seriesId}`;
  const cached = catalogCache.get(key);
  if (cached && !forceRefresh && Date.now() - cached.ts < CATALOG_TTL) return cached.data;

  const data = await apiCall('series_info', { series_id: seriesId });
  if (data.error) throw new Error(data.error);

  catalogCache.set(key, { data, ts: Date.now() });
  return data;
}

async function getStreamDetails(id, type = 'vod', title = '') {
  const data = await apiCall('stream_details', { id, type, title });
  if (data.error) throw new Error(data.error);
  return data;
}

module.exports = {
  getGuestToken,
  apiCall,
  getStreamUrl,
  getCatalog,
  getCategories,
  getStreams,
  getSeriesInfo,
  getStreamDetails,
};

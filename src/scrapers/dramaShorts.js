const axios = require("axios");

const DM_API = "https://api.dailymotion.com";
const CACHE_TTL    = 30 * 60 * 1000; // 30 min — listados generales
const CACHE_TTL_VIDEO = 60 * 60 * 1000; // 1 h  — video individual
const FIELDS = "id,title,description,duration,thumbnail_url,embed_url,views_total,created_time,language,channel,owner.screenname";

const _cache = {};

/* ─── helpers ──────────────────────────────────────────────── */
function ck(...parts) { return parts.join("_"); }

function hit(key, ttl) {
  const e = _cache[key];
  return e && (Date.now() - e.ts) < ttl ? e.data : null;
}
function set(key, data) { _cache[key] = { ts: Date.now(), data }; }

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${m}:${String(s).padStart(2,"0")}`;
}

function mapVideo(v) {
  return {
    id:               v.id,
    titulo:           v.title,
    descripcion:      (v.description || "").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").trim(),
    duracion:         fmt(v.duration),
    duracionSegundos: v.duration,
    thumbnail:        v.thumbnail_url,
    embed:            v.embed_url,
    vistas:           v.views_total,
    idioma:           v.language || "desconocido",
    canal:            v["owner.screenname"] || v.channel || "desconocido",
    fechaPublicacion: v.created_time ? new Date(v.created_time * 1000).toISOString() : null,
  };
}

async function dm(path, params = {}) {
  const res = await axios.get(`${DM_API}${path}`, { params, timeout: 15000 });
  return res.data;
}

/* ─── 1. Recientes (/drama-shorts) ─────────────────────────── */
async function getDramaShorts({ page = 1, limit = 20, lang = null, q = null } = {}) {
  const key = ck("recientes", page, limit, lang || "all", q || "default");
  const cached = hit(key, CACHE_TTL);
  if (cached) return cached;

  const params = {
    fields: FIELDS,
    limit:  Math.min(limit, 100),
    page,
    sort:   "recent",
    channel: "shortfilms",
    longer_than:  60,
    shorter_than: 7200,
    search: q || "short drama",
  };
  if (lang) params.language = lang;

  console.log(`🎭 drama-shorts recientes (p${page} lang:${lang||"all"} q:${params.search})`);
  const raw = await dm("/videos", params);
  const result = {
    total:       raw.total,
    pagina:      page,
    limite:      limit,
    hayMas:      raw.has_more,
    paginaSiguiente: raw.has_more ? page + 1 : null,
    actualizado: new Date().toISOString(),
    fuente:      "dailymotion.com",
    busqueda:    params.search,
    idiomaFiltro: lang || null,
    videos:      (raw.list || []).map(mapVideo),
  };
  set(key, result);
  return result;
}

/* ─── 2. Buscar por título (/drama-shorts/buscar) ───────────── */
async function buscarDrama({ titulo, page = 1, limit = 20, lang = null } = {}) {
  if (!titulo) throw new Error("El parámetro 'titulo' es requerido");
  const key = ck("buscar", titulo, page, limit, lang || "all");
  const cached = hit(key, CACHE_TTL);
  if (cached) return cached;

  const params = {
    fields: FIELDS,
    search: titulo,
    limit:  Math.min(limit, 100),
    page,
    sort:   "recent",
    longer_than: 60,
  };
  if (lang) params.language = lang;

  console.log(`🔍 drama-shorts buscar: "${titulo}" (p${page} lang:${lang||"all"})`);
  const raw = await dm("/videos", params);
  const result = {
    titulo,
    total:       raw.total,
    pagina:      page,
    limite:      limit,
    hayMas:      raw.has_more,
    paginaSiguiente: raw.has_more ? page + 1 : null,
    actualizado: new Date().toISOString(),
    fuente:      "dailymotion.com",
    idiomaFiltro: lang || null,
    videos:      (raw.list || []).map(mapVideo),
  };
  set(key, result);
  return result;
}

/* ─── 3. Video por ID (/drama-shorts/video/:id) ─────────────── */
async function getVideoById(id) {
  if (!id) throw new Error("ID de video requerido");
  const key = ck("video", id);
  const cached = hit(key, CACHE_TTL_VIDEO);
  if (cached) return cached;

  console.log(`🎬 drama-shorts video: ${id}`);
  const v = await dm(`/video/${id}`, { fields: FIELDS + ",tags" });
  const result = {
    ...mapVideo(v),
    tags: v.tags || [],
    actualizado: new Date().toISOString(),
    fuente: "dailymotion.com",
  };
  set(key, result);
  return result;
}

/* ─── 4. Videos de un canal (/drama-shorts/canal/:username) ─── */
async function getVideosByCanal({ username, page = 1, limit = 20, lang = null } = {}) {
  if (!username) throw new Error("El parámetro 'username' es requerido");
  const key = ck("canal", username, page, limit, lang || "all");
  const cached = hit(key, CACHE_TTL);
  if (cached) return cached;

  const params = {
    fields: FIELDS,
    limit:  Math.min(limit, 100),
    page,
    sort:   "recent",
  };
  if (lang) params.language = lang;

  console.log(`📺 drama-shorts canal: ${username} (p${page})`);
  const raw = await dm(`/user/${username}/videos`, params);
  const result = {
    canal:       username,
    total:       raw.total,
    pagina:      page,
    limite:      limit,
    hayMas:      raw.has_more,
    paginaSiguiente: raw.has_more ? page + 1 : null,
    actualizado: new Date().toISOString(),
    fuente:      "dailymotion.com",
    idiomaFiltro: lang || null,
    videos:      (raw.list || []).map(mapVideo),
  };
  set(key, result);
  return result;
}

/* ─── 5. Populares (/drama-shorts/populares) ────────────────── */
async function getDramaPopulares({ page = 1, limit = 20, lang = null } = {}) {
  const key = ck("populares", page, limit, lang || "all");
  const cached = hit(key, CACHE_TTL);
  if (cached) return cached;

  const params = {
    fields: FIELDS,
    limit:  Math.min(limit, 100),
    page,
    sort:   "visited",
    channel: "shortfilms",
    longer_than: 60,
    shorter_than: 7200,
    search: "short drama",
  };
  if (lang) params.language = lang;

  console.log(`🔥 drama-shorts populares (p${page} lang:${lang||"all"})`);
  const raw = await dm("/videos", params);
  const result = {
    total:       raw.total,
    pagina:      page,
    limite:      limit,
    hayMas:      raw.has_more,
    paginaSiguiente: raw.has_more ? page + 1 : null,
    actualizado: new Date().toISOString(),
    fuente:      "dailymotion.com",
    idiomaFiltro: lang || null,
    videos:      (raw.list || []).map(mapVideo),
  };
  set(key, result);
  return result;
}

/* ─── 6. Tendencias (/drama-shorts/tendencias) ──────────────── */
async function getDramaTendencias({ page = 1, limit = 20, lang = null } = {}) {
  const key = ck("tendencias", page, limit, lang || "all");
  const cached = hit(key, CACHE_TTL);
  if (cached) return cached;

  const params = {
    fields: FIELDS,
    limit:  Math.min(limit, 100),
    page,
    sort:   "trending",
    channel: "shortfilms",
    longer_than: 60,
    shorter_than: 7200,
    search: "short drama",
  };
  if (lang) params.language = lang;

  console.log(`📈 drama-shorts tendencias (p${page} lang:${lang||"all"})`);
  const raw = await dm("/videos", params);
  const result = {
    total:       raw.total,
    pagina:      page,
    limite:      limit,
    hayMas:      raw.has_more,
    paginaSiguiente: raw.has_more ? page + 1 : null,
    actualizado: new Date().toISOString(),
    fuente:      "dailymotion.com",
    idiomaFiltro: lang || null,
    videos:      (raw.list || []).map(mapVideo),
  };
  set(key, result);
  return result;
}

/* ─── cache clear ────────────────────────────────────────────── */
function clearDramaCache() {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}

module.exports = {
  getDramaShorts,
  buscarDrama,
  getVideoById,
  getVideosByCanal,
  getDramaPopulares,
  getDramaTendencias,
  clearDramaCache,
};

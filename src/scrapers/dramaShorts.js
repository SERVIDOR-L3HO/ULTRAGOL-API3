const axios = require("axios");

const DM_API = "https://api.dailymotion.com/videos";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

const _cache = {};

function cacheKey(page, limit, lang, q) {
  return `drama_${page}_${limit}_${lang || "all"}_${q || "default"}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function getDramaShorts({ page = 1, limit = 20, lang = null, q = null } = {}) {
  const key = cacheKey(page, limit, lang, q);
  const now = Date.now();

  if (_cache[key] && (now - _cache[key].ts) < CACHE_TTL) {
    console.log(`🎭 dramaShorts: usando caché (${key})`);
    return _cache[key].data;
  }

  const params = {
    fields: "id,title,description,duration,thumbnail_url,embed_url,views_total,created_time,channel,language,owner.screenname",
    limit: Math.min(limit, 100),
    page,
    sort: "recent",
    channel: "shortfilms",
    longer_than: 60,      // mínimo 1 min
    shorter_than: 7200,   // máximo 2 horas
  };

  // Búsqueda personalizada o términos por defecto
  params.search = q || "short drama";

  // Filtro de idioma
  if (lang) params.language = lang;

  console.log(`🎭 Obteniendo drama shorts de Dailymotion (página ${page}, idioma: ${lang || "todos"})...`);

  const res = await axios.get(DM_API, { params, timeout: 15000 });
  const raw = res.data;

  const videos = (raw.list || []).map((v) => ({
    id: v.id,
    titulo: v.title,
    descripcion: (v.description || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim(),
    duracion: formatDuration(v.duration),
    duracionSegundos: v.duration,
    thumbnail: v.thumbnail_url,
    embed: v.embed_url,
    url: `https://www.dailymotion.com/video/${v.id}`,
    vistas: v.views_total,
    idioma: v.language || "desconocido",
    canal: v["owner.screenname"] || v.channel || "desconocido",
    fechaPublicacion: v.created_time
      ? new Date(v.created_time * 1000).toISOString()
      : null,
  }));

  const result = {
    total: raw.total,
    pagina: page,
    limite: limit,
    hayMas: raw.has_more,
    paginaSiguiente: raw.has_more ? page + 1 : null,
    actualizado: new Date().toISOString(),
    fuente: "dailymotion.com",
    busqueda: params.search,
    idiomFiltro: lang || null,
    videos,
  };

  _cache[key] = { ts: now, data: result };
  console.log(`✅ dramaShorts: ${videos.length} videos obtenidos (total: ${raw.total})`);
  return result;
}

function clearDramaCache() {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}

module.exports = { getDramaShorts, clearDramaCache };

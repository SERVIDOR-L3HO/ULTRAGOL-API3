const axios = require("axios");
const cheerio = require("cheerio");

const SITE_ORIGIN = "https://futbollibretvs.co";
const HOME_URL = `${SITE_ORIGIN}/channels`;
const PLAYBACK_API = `${SITE_ORIGIN}/api/channel-playback.php`;
const REQUEST_TIMEOUT = 15000;
const CATALOG_TTL = 10 * 60 * 1000;
const STREAM_TTL = 2 * 60 * 1000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const cache = {
  catalog: null,
  streams: new Map()
};

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

function isSiteUrl(value) {
  try {
    return new URL(value).hostname === new URL(SITE_ORIGIN).hostname;
  } catch {
    return false;
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function channelSlugFromUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    const channelMatch = pathname.match(/^\/channel\/([^/]+)\/?$/i);
    if (channelMatch) return channelMatch[1].toLowerCase();

    // Mantener compatibilidad con las URLs del scraper anterior.
    const legacyMatch = pathname.match(/^\/([^/]+)-en-vivo\.php$/i);
    return legacyMatch ? legacyMatch[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

async function fetchHtml(url, referer = HOME_URL) {
  const response = await axios.get(url, {
    headers: { ...HEADERS, Referer: referer },
    timeout: REQUEST_TIMEOUT,
    maxContentLength: 4 * 1024 * 1024,
    maxBodyLength: 4 * 1024 * 1024,
    validateStatus: status => status >= 200 && status < 400
  });
  return {
    html: typeof response.data === "string" ? response.data : String(response.data || ""),
    finalUrl: response.request?.res?.responseUrl || url
  };
}

async function fetchJson(url, referer = HOME_URL) {
  const response = await axios.get(url, {
    headers: { ...HEADERS, Referer: referer, Accept: "application/json" },
    timeout: REQUEST_TIMEOUT,
    maxContentLength: 2 * 1024 * 1024,
    maxBodyLength: 2 * 1024 * 1024,
    validateStatus: status => status >= 200 && status < 400
  });
  return response.data;
}

async function scrapNovaCatalog(force = false) {
  if (!force && cache.catalog && Date.now() - cache.catalog.timestamp < CATALOG_TTL) {
    return cache.catalog.data;
  }

  const { html } = await fetchHtml(HOME_URL);
  const $ = cheerio.load(html);
  const seen = new Set();
  const canales = [];

  $("a.channel-card[href], a[href*='/channel/']").each((_, element) => {
    const url = absoluteUrl($(element).attr("href"), HOME_URL);
    const slug = channelSlugFromUrl(url);
    if (!url || !slug || !isSiteUrl(url) || seen.has(slug)) return;

    seen.add(slug);
    canales.push({
      id: slug,
      nombre: cleanText($(element).find("h3").first().text())
        || cleanText($(element).text())
        || slug.replace(/-/g, " ").toUpperCase(),
      url,
      imagen: absoluteUrl($(element).find("img").attr("src"), HOME_URL)
    });
  });

  const data = {
    fuente: SITE_ORIGIN,
    pagina: HOME_URL,
    total: canales.length,
    canales,
    actualizado: new Date().toISOString()
  };
  cache.catalog = { data, timestamp: Date.now() };
  return data;
}

async function resolveNovaChannel(channel, index) {
  try {
    const playback = await fetchJson(
      `${PLAYBACK_API}?slug=${encodeURIComponent(channel.id)}&server=0`,
      channel.url
    );
    if (!playback?.success || !playback.url) {
      throw new Error(playback?.error || "La fuente no publicó una transmisión");
    }

    return {
      opcion: index + 1,
      id: channel.id,
      nombre: channel.nombre,
      pagina: channel.url,
      url: playback.url,
      tipo: playback.kind || "unknown",
      servidor: playback.server_name || null,
      servidorId: playback.server_id ?? null,
      disponible: true,
      expira: playback.expires_at || null
    };
  } catch (error) {
    return {
      opcion: index + 1,
      id: channel.id,
      nombre: channel.nombre,
      pagina: channel.url,
      disponible: false,
      error: error.response?.status
        ? `HTTP ${error.response.status}`
        : error.message
    };
  }
}

async function scrapNovaChannel(channel, force = false) {
  const slug = cleanText(channel).toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) throw new Error("El parámetro canal es requerido");

  const cached = cache.streams.get(slug);
  if (!force && cached && Date.now() - cached.timestamp < STREAM_TTL) {
    return cached.data;
  }

  const catalog = await scrapNovaCatalog(force);
  const catalogChannel = catalog.canales.find(item => item.id === slug);
  if (!catalogChannel) {
    const error = new Error(`Canal no encontrado: ${slug}`);
    error.statusCode = 404;
    throw error;
  }

  const stream = await resolveNovaChannel(catalogChannel, 0);
  const directLinks = stream.disponible ? [stream.url] : [];

  const data = {
    fuente: SITE_ORIGIN,
    canal: {
      id: slug,
      nombre: catalogChannel.nombre,
      pagina: catalogChannel.url,
      imagen: catalogChannel.imagen
    },
    totalOpciones: stream.disponible ? 1 : 0,
    opciones: [stream],
    enlaces: directLinks,
    m3u8: stream.tipo === "hls" ? directLinks : [],
    actualizado: new Date().toISOString()
  };

  cache.streams.set(slug, { data, timestamp: Date.now() });
  return data;
}

async function scrapNovaCatalogLinks(force = false) {
  const cacheKey = "catalog-links";
  const cached = cache.streams.get(cacheKey);
  if (!force && cached && Date.now() - cached.timestamp < STREAM_TTL) {
    return cached.data;
  }

  const catalog = await scrapNovaCatalog(force);
  const resolved = [];
  const BATCH_SIZE = 8;

  for (let index = 0; index < catalog.canales.length; index += BATCH_SIZE) {
    const batch = catalog.canales.slice(index, index + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((channel, batchIndex) => resolveNovaChannel(channel, index + batchIndex))
    );
    resolved.push(...results);
  }

  const enlaces = resolved
    .filter(item => item.disponible)
    .map(item => ({
      id: item.id,
      nombre: item.nombre,
      url: item.url,
      tipo: item.tipo,
      pagina: item.pagina,
      servidor: item.servidor,
      expira: item.expira
    }));

  const data = {
    fuente: SITE_ORIGIN,
    pagina: HOME_URL,
    total: resolved.length,
    disponibles: enlaces.length,
    enlaces,
    canales: resolved,
    actualizado: new Date().toISOString()
  };
  cache.streams.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

async function scrapNova({ canal, url, force = false } = {}) {
  if (url) {
    if (!isSiteUrl(url)) {
      const error = new Error("La URL debe pertenecer a futbollibretvs.co");
      error.statusCode = 400;
      throw error;
    }
    canal = channelSlugFromUrl(url);
    if (!canal) {
      const error = new Error("La URL debe ser una página con formato /channel/<slug>");
      error.statusCode = 400;
      throw error;
    }
  }

  if (canal) return scrapNovaChannel(canal, force);
  return scrapNovaCatalogLinks(force);
}

module.exports = {
  scrapNova,
  scrapNovaCatalog,
  scrapNovaChannel
};
const axios = require("axios");
const cheerio = require("cheerio");

const SITE_ORIGIN = "https://www.televisiongratishd.org";
const HOME_URL = `${SITE_ORIGIN}/`;
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
    const match = pathname.match(/^\/([^/]+)-en-vivo\.php$/i);
    return match ? match[1].toLowerCase() : null;
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

async function scrapNovaCatalog(force = false) {
  if (!force && cache.catalog && Date.now() - cache.catalog.timestamp < CATALOG_TTL) {
    return cache.catalog.data;
  }

  const { html } = await fetchHtml(HOME_URL);
  const $ = cheerio.load(html);
  const seen = new Set();
  const canales = [];

  $("a.channel[href]").each((_, element) => {
    const url = absoluteUrl($(element).attr("href"), HOME_URL);
    const slug = channelSlugFromUrl(url);
    if (!url || !slug || !isSiteUrl(url) || seen.has(slug)) return;

    seen.add(slug);
    canales.push({
      id: slug,
      nombre: cleanText($(element).text()) || slug.replace(/-/g, " ").toUpperCase(),
      url,
      imagen: absoluteUrl($(element).find("img").attr("src"), HOME_URL)
    });
  });

  const data = {
    fuente: SITE_ORIGIN,
    total: canales.length,
    canales,
    actualizado: new Date().toISOString()
  };
  cache.catalog = { data, timestamp: Date.now() };
  return data;
}

function decodeJsString(value) {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractHlsUrl(html, baseUrl) {
  const candidates = [];
  const sourcePattern = /(?:var|let|const)\s+(?:src|source|streamUrl|stream_url)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = sourcePattern.exec(html))) {
    candidates.push(decodeJsString(match[1]));
  }

  const directPattern = /https?:\/\/[^"'\\\s]+(?:\.m3u8|playlist\.php)[^"'\\\s]*/gi;
  candidates.push(...(html.match(directPattern) || []).map(decodeJsString));

  for (const candidate of candidates) {
    const url = absoluteUrl(candidate, baseUrl);
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return null;
}

async function resolveNovaOption(optionUrl, channelUrl, index) {
  try {
    const core = await fetchHtml(optionUrl, channelUrl);
    const $core = cheerio.load(core.html);
    const iframeUrl = absoluteUrl($core("#player-frame").attr("src"), optionUrl);
    if (!iframeUrl) {
      return {
        opcion: index + 1,
        url: optionUrl,
        disponible: false,
        error: "La opción no publicó un reproductor"
      };
    }

    const player = await fetchHtml(iframeUrl, optionUrl);
    const m3u8 = extractHlsUrl(player.html, iframeUrl);
    return {
      opcion: index + 1,
      url: optionUrl,
      iframe: iframeUrl,
      m3u8,
      disponible: Boolean(m3u8),
      ...(m3u8 ? {} : { error: "No se encontró una URL HLS en el reproductor" })
    };
  } catch (error) {
    return {
      opcion: index + 1,
      url: optionUrl,
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

  const { html } = await fetchHtml(catalogChannel.url);
  const $ = cheerio.load(html);
  const optionUrls = $(".option[data-src]")
    .map((_, element) => absoluteUrl($(element).attr("data-src"), catalogChannel.url))
    .get()
    .filter(url => isSiteUrl(url));

  const streams = await Promise.all(
    optionUrls.map((url, index) => resolveNovaOption(url, catalogChannel.url, index))
  );

  const data = {
    fuente: SITE_ORIGIN,
    canal: {
      id: slug,
      nombre: cleanText($("h1").first().text()) || catalogChannel.nombre,
      pagina: catalogChannel.url,
      imagen: absoluteUrl($('meta[property="og:image"]').attr("content"), catalogChannel.url)
    },
    totalOpciones: streams.length,
    opciones: streams,
    m3u8: streams.filter(stream => stream.m3u8).map(stream => stream.m3u8),
    actualizado: new Date().toISOString()
  };

  cache.streams.set(slug, { data, timestamp: Date.now() });
  return data;
}

async function scrapNova({ canal, url, force = false } = {}) {
  if (url) {
    if (!isSiteUrl(url)) {
      const error = new Error("La URL debe pertenecer a televisiongratishd.org");
      error.statusCode = 400;
      throw error;
    }
    canal = channelSlugFromUrl(url);
    if (!canal) {
      const error = new Error("La URL debe ser una página de canal terminada en -en-vivo.php");
      error.statusCode = 400;
      throw error;
    }
  }

  if (canal) return scrapNovaChannel(canal, force);
  return scrapNovaCatalog(force);
}

module.exports = {
  scrapNova,
  scrapNovaCatalog,
  scrapNovaChannel
};
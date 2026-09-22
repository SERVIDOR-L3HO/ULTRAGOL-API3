const axios = require("axios");
const cheerio = require("cheerio");
const { randomUUID } = require("crypto");

const SITE_ORIGIN = "https://futbollibretvs.co";
const HOME_URL = `${SITE_ORIGIN}/channels`;
const PLAYBACK_API = `${SITE_ORIGIN}/api/channel-playback.php`;
const REQUEST_TIMEOUT = 15000;
const CATALOG_TTL = 10 * 60 * 1000;
const STREAM_TTL = 2 * 60 * 1000;
const RELAY_KEY_TTL = 2 * 60 * 60 * 1000;
const PLAYBACK_SESSION_TTL = 45 * 1000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const cache = {
  catalog: null,
  streams: new Map()
};
const relayKeys = new Map();
const playbackSessions = new Map();

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
  return {
    data: response.data,
    headers: response.headers
  };
}

function extractM3u8Url(html, baseUrl) {
  const normalized = String(html || "")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/");
  const matches = normalized.match(
    /(?:https?:)?\/\/[^"'\\\s<>]+?\.m3u8(?:\?[^"'\\\s<>]*)?/gi
  ) || [];

  for (const candidate of matches) {
    const resolved = absoluteUrl(candidate, baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

async function discoverNovaPlayback(url, referer = HOME_URL, visited = new Set()) {
  const absolute = absoluteUrl(url, referer);
  if (!absolute || visited.has(absolute) || visited.size >= 5) {
    return null;
  }
  visited.add(absolute);

  const page = await fetchHtml(absolute, referer);
  const directM3u8 = extractM3u8Url(page.html, page.finalUrl || absolute);
  if (directM3u8) {
    return {
      kind: "hls",
      url: directM3u8,
      referer: page.finalUrl || absolute
    };
  }

  const $ = cheerio.load(page.html);
  const iframeUrls = [];
  $("iframe[src]").each((_, element) => {
    const iframeUrl = absoluteUrl($(element).attr("src"), page.finalUrl || absolute);
    if (iframeUrl && !iframeUrls.includes(iframeUrl)) iframeUrls.push(iframeUrl);
  });

  for (const iframeUrl of iframeUrls) {
    const discovered = await discoverNovaPlayback(
      iframeUrl,
      page.finalUrl || absolute,
      visited
    );
    if (discovered) return discovered;
  }

  return iframeUrls[0]
    ? { kind: "iframe", url: iframeUrls[0], referer: page.finalUrl || absolute }
    : { kind: "iframe", url: absolute, referer: page.finalUrl || absolute };
}

function playbackCookie(headers) {
  const cookies = headers?.["set-cookie"];
  if (!Array.isArray(cookies)) return "";
  return cookies
    .map(cookie => String(cookie).split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

function isSourceRelayUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === new URL(SITE_ORIGIN).hostname
      && parsed.pathname === "/api/hls-relay.php";
  } catch {
    return false;
  }
}

function registerRelayKey(targetUrl, cookie, referer, fallback = null) {
  const key = randomUUID();
  relayKeys.set(key, {
    targetUrl,
    cookie,
    referer,
    fallback,
    createdAt: Date.now()
  });
  return key;
}

function relayUrlFor(targetUrl, cookie, referer, fallback = null) {
  const key = registerRelayKey(targetUrl, cookie, referer, fallback);
  const params = new URLSearchParams({
    stream: "true",
    k: key
  });
  if (fallback?.channelSlug) {
    params.set("canal", fallback.channelSlug);
  }
  if (Number.isInteger(fallback?.variant)) {
    params.set("variant", String(fallback.variant));
  }
  if (Number.isInteger(fallback?.segment)) {
    params.set("segment", String(fallback.segment));
  }
  return `/nova?${params.toString()}`;
}

function stableStreamUrl(channelSlug, options = {}) {
  const params = new URLSearchParams({
    stream: "true",
    canal: channelSlug
  });
  if (Number.isInteger(options.variant)) {
    params.set("variant", String(options.variant));
  }
  if (Number.isInteger(options.segment)) {
    params.set("segment", String(options.segment));
  }
  return `/nova?${params.toString()}`;
}

function cleanupRelayKeys() {
  const expiresBefore = Date.now() - RELAY_KEY_TTL;
  for (const [key, entry] of relayKeys) {
    if (entry.createdAt < expiresBefore) relayKeys.delete(key);
  }
}

function rewriteManifest(manifest, entry) {
  return manifest.split(/\r?\n/).map(line => {
    const rewriteUrl = rawUrl => {
      const resolvedUrl = absoluteUrl(rawUrl, entry.targetUrl);
      if (!resolvedUrl || !isSourceRelayUrl(resolvedUrl)) return rawUrl;
      return relayUrlFor(resolvedUrl, entry.cookie, entry.referer);
    };

    if (line.includes('URI="')) {
      return line.replace(/URI="([^"]+)"/g, (_, rawUrl) => {
        return `URI="${rewriteUrl(rawUrl)}"`;
      });
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const rewritten = rewriteUrl(trimmed);
    return line.replace(trimmed, rewritten);
  }).join("\n");
}

function isManifestResponse(response, body) {
  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  return contentType.includes("mpegurl")
    || contentType.includes("apple.mpegurl")
    || body.toString("utf8", 0, 7) === "#EXTM3U";
}

function manifestVariantUrl(manifest, baseUrl, variantIndex) {
  let currentVariant = -1;
  const lines = manifest.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("#EXT-X-STREAM-INF")) continue;
    currentVariant += 1;

    for (let next = index + 1; next < lines.length; next += 1) {
      const candidate = lines[next].trim();
      if (!candidate || candidate.startsWith("#")) continue;
      if (currentVariant === variantIndex) {
        return absoluteUrl(candidate, baseUrl);
      }
      break;
    }
  }

  return null;
}

function manifestSegmentUrl(manifest, baseUrl, sequence) {
  const mediaSequenceMatch = manifest.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/i);
  let currentSequence = mediaSequenceMatch ? Number(mediaSequenceMatch[1]) : 0;
  const lines = manifest.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("#EXTINF")) continue;

    for (let next = index + 1; next < lines.length; next += 1) {
      const candidate = lines[next].trim();
      if (!candidate || candidate.startsWith("#")) continue;
      if (currentSequence === sequence) {
        return absoluteUrl(candidate, baseUrl);
      }
      currentSequence += 1;
      break;
    }
  }

  return null;
}

function rewriteStableManifest(
  manifest,
  channelSlug,
  variantIndex = null,
  relayContext = null
) {
  const lines = manifest.split(/\r?\n/);
  const mediaSequenceMatch = manifest.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/i);
  let currentVariant = Number.isInteger(variantIndex) ? variantIndex : -1;
  let nextIsVariant = false;
  let currentSequence = mediaSequenceMatch ? Number(mediaSequenceMatch[1]) : 0;
  let nextIsSegment = false;

  return lines.map(line => {
    const trimmed = line.trim();

    if (trimmed.startsWith("#EXT-X-STREAM-INF")) {
      currentVariant += 1;
      nextIsVariant = true;
      return line;
    }

    if (trimmed.startsWith("#EXTINF")) {
      nextIsSegment = true;
      return line;
    }

    if (!trimmed || trimmed.startsWith("#")) return line;

    if (nextIsVariant) {
      nextIsVariant = false;
      return line.replace(trimmed, stableStreamUrl(channelSlug, {
        variant: currentVariant
      }));
    }

    if (nextIsSegment) {
      nextIsSegment = false;
      const sourceUrl = relayContext
        ? absoluteUrl(trimmed, relayContext.baseUrl)
        : null;
      const rewritten = sourceUrl && isSourceRelayUrl(sourceUrl)
        ? relayUrlFor(sourceUrl, relayContext.cookie, relayContext.referer, {
            channelSlug,
            variant: currentVariant,
            segment: currentSequence
          })
        : stableStreamUrl(channelSlug, {
            variant: currentVariant,
            segment: currentSequence
          });
      currentSequence += 1;
      return line.replace(trimmed, rewritten);
    }

    return line;
  }).join("\n");
}

async function fetchSource(url, cookie, referer) {
  const headers = {
    ...HEADERS,
    Accept: "*/*",
    Referer: referer || `${SITE_ORIGIN}/channels`,
    Origin: SITE_ORIGIN
  };
  if (cookie) headers.Cookie = cookie;

  return axios.get(url, {
    headers,
    responseType: "arraybuffer",
    timeout: REQUEST_TIMEOUT,
    maxRedirects: 5,
    validateStatus: status => status < 500
  });
}

async function getPlaybackSession(channel, force = false) {
  const cached = playbackSessions.get(channel.id);
  if (!force && cached && Date.now() - cached.createdAt < PLAYBACK_SESSION_TTL) {
    return cached;
  }

  const playbackResponse = await fetchJson(
    `${PLAYBACK_API}?slug=${encodeURIComponent(channel.id)}&server=0`,
    channel.url
  );
  const playback = playbackResponse.data;
  if (!playback?.success || !playback.url) {
    throw new Error(playback?.error || "La fuente no publicó una transmisión HLS");
  }

  let targetUrl = playback.url;
  let referer = channel.url;
  if (playback.kind !== "hls") {
    const discovered = await discoverNovaPlayback(playback.url, channel.url);
    if (!discovered || discovered.kind !== "hls" || !discovered.url) {
      throw new Error("La fuente no publicó una transmisión HLS");
    }
    targetUrl = discovered.url;
    referer = discovered.referer || playback.url;
  }

  const session = {
    targetUrl,
    cookie: playbackCookie(playbackResponse.headers),
    referer,
    createdAt: Date.now()
  };
  playbackSessions.set(channel.id, session);
  return session;
}

async function loadStableChannelStream(channel, variantIndex, segmentSequence) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const session = await getPlaybackSession(channel, attempt > 0);
      const masterResponse = await fetchSource(
        session.targetUrl,
        session.cookie,
        session.referer
      );
      const masterBody = Buffer.from(masterResponse.data);
      const masterText = masterBody.toString("utf8");
      const hasVariants = /#EXT-X-STREAM-INF/i.test(masterText);

      if (masterResponse.status >= 400) {
        throw new Error(`Fuente HLS respondió HTTP ${masterResponse.status}`);
      }

      if (!Number.isInteger(variantIndex)) {
        return {
          body: rewriteStableManifest(
            masterText,
            channel.id,
            hasVariants ? null : 0,
            hasVariants
              ? null
              : {
                  baseUrl: session.targetUrl,
                  cookie: session.cookie,
                  referer: session.referer
                }
          ),
          contentType: "application/vnd.apple.mpegurl",
          isManifest: true
        };
      }

      const variantUrl = hasVariants
        ? manifestVariantUrl(masterText, session.targetUrl, variantIndex)
        : session.targetUrl;
      if (!variantUrl) {
        throw new Error("La variante HLS solicitada ya no está disponible");
      }

      const variantResponse = hasVariants
        ? await fetchSource(variantUrl, session.cookie, session.referer)
        : masterResponse;
      const variantBody = hasVariants
        ? Buffer.from(variantResponse.data)
        : masterBody;
      if (hasVariants && variantResponse.status >= 400) {
        throw new Error(`Variante HLS respondió HTTP ${variantResponse.status}`);
      }

      if (!Number.isInteger(segmentSequence)) {
        return {
          body: rewriteStableManifest(
            variantBody.toString("utf8"),
            channel.id,
            variantIndex,
            {
              baseUrl: variantUrl,
              cookie: session.cookie,
              referer: session.referer
            }
          ),
          contentType: "application/vnd.apple.mpegurl",
          isManifest: true
        };
      }

      let segmentUrl = manifestSegmentUrl(
        variantBody.toString("utf8"),
        variantUrl,
        segmentSequence
      );
      if (!segmentUrl) {
        const mediaSequenceMatch = variantBody
          .toString("utf8")
          .match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/i);
        const currentSequence = mediaSequenceMatch
          ? Number(mediaSequenceMatch[1])
          : null;
        if (Number.isInteger(currentSequence)) {
          segmentUrl = manifestSegmentUrl(
            variantBody.toString("utf8"),
            variantUrl,
            currentSequence
          );
        }
      }
      if (!segmentUrl) {
        throw new Error("El segmento HLS solicitado ya no está disponible");
      }

      const segmentResponse = await fetchSource(
        segmentUrl,
        session.cookie,
        session.referer
      );
      if (segmentResponse.status >= 400) {
        throw new Error(`Segmento HLS respondió HTTP ${segmentResponse.status}`);
      }

      return {
        body: Buffer.from(segmentResponse.data),
        contentType: segmentResponse.headers["content-type"] || "video/mp2t",
        isManifest: false
      };
    } catch (error) {
      lastError = error;
      playbackSessions.delete(channel.id);
    }
  }

  throw lastError || new Error("No se pudo obtener el stream HLS");
}

async function proxyStableNovaStream(req, res) {
  const slug = cleanText(req.query.canal).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const variantValue = req.query.variant;
  const segmentValue = req.query.segment;
  const variantIndex = variantValue === undefined ? null : Number(variantValue);
  const segmentSequence = segmentValue === undefined ? null : Number(segmentValue);

  if (!slug) {
    return res.status(400).json({
      success: false,
      error: "El parámetro canal es requerido para el stream"
    });
  }
  if (variantValue !== undefined && !Number.isInteger(variantIndex)) {
    return res.status(400).json({
      success: false,
      error: "La variante HLS no es válida"
    });
  }
  if (segmentValue !== undefined
    && (!Number.isInteger(segmentSequence) || !Number.isInteger(variantIndex))) {
    return res.status(400).json({
      success: false,
      error: "El segmento HLS no es válido"
    });
  }

  try {
    const catalog = await scrapNovaCatalog(false);
    const channel = catalog.canales.find(item => item.id === slug);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: `Canal no encontrado: ${slug}`
      });
    }

    const result = await loadStableChannelStream(
      channel,
      variantIndex,
      segmentSequence
    );

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", result.contentType);
    return res.send(result.body);
  } catch (error) {
    console.error("[nova-stream] Error:", error.message);
    return res.status(502).json({
      success: false,
      error: "No se pudo actualizar el stream automáticamente"
    });
  }
}

async function proxyNovaStream(req, res) {
  cleanupRelayKeys();
  const key = typeof req.query.k === "string" ? req.query.k : "";
  const entry = relayKeys.get(key);
  if (!entry) {
    if (typeof req.query.canal === "string" && req.query.canal) {
      return proxyStableNovaStream(req, res);
    }
    return res.status(404).json({
      success: false,
      error: "El enlace del stream expiró o no existe"
    });
  }

  try {
    const headers = {
      ...HEADERS,
      Accept: "*/*",
      Referer: entry.referer || `${SITE_ORIGIN}/channels`,
      Origin: SITE_ORIGIN
    };
    if (entry.cookie) headers.Cookie = entry.cookie;
    if (req.headers.range) headers.Range = req.headers.range;

    const response = await axios.get(entry.targetUrl, {
      headers,
      responseType: "arraybuffer",
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 5,
      validateStatus: status => status < 500
    });

    if (response.status >= 400 && entry.fallback?.channelSlug) {
      return proxyStableNovaStream(req, res);
    }

    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    const body = Buffer.from(response.data);
    const isManifest = contentType.includes("mpegurl")
      || contentType.includes("apple.mpegurl")
      || body.toString("utf8", 0, 7) === "#EXTM3U";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.removeHeader("content-length");

    if (isManifest) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.status(response.status).send(
        rewriteManifest(body.toString("utf8"), entry)
      );
    }

    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    return res.status(response.status).send(body);
  } catch (error) {
    console.error("[nova-stream] Error:", error.message);
    return res.status(502).json({
      success: false,
      error: "No se pudo obtener el stream"
    });
  }
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
    const playbackResponse = await fetchJson(
      `${PLAYBACK_API}?slug=${encodeURIComponent(channel.id)}&server=0`,
      channel.url
    );
    const playback = playbackResponse.data;
    if (!playback?.success || !playback.url) {
      throw new Error(playback?.error || "La fuente no publicó una transmisión");
    }

    let streamType = playback.kind || "unknown";
    let streamUrl = playback.url;
    if (playback.kind === "hls") {
      streamUrl = stableStreamUrl(channel.id);
    } else {
      const discovered = await discoverNovaPlayback(playback.url, channel.url);
      if (discovered?.kind === "hls" && discovered.url) {
        streamType = "hls";
        streamUrl = stableStreamUrl(channel.id);
      } else if (discovered?.url) {
        streamUrl = discovered.url;
      }
    }

    return {
      opcion: index + 1,
      id: channel.id,
      nombre: channel.nombre,
      logo: channel.imagen || null,
      pagina: channel.url,
      url: streamUrl,
      tipo: streamType,
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
      logo: channel.imagen || null,
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
  const directLinks = stream.disponible
    ? [{
        logo: catalogChannel.imagen || null,
        nombre: catalogChannel.nombre,
        url: stream.url
      }]
    : [];

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
    m3u8: stream.tipo === "hls" ? directLinks.map(item => item.url) : [],
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
      logo: item.logo,
      nombre: item.nombre,
      url: item.url
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
  scrapNovaChannel,
  proxyNovaStream,
  proxyStableNovaStream
};
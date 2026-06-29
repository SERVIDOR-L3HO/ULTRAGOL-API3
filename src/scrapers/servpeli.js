const axios = require('axios');
const cheerio = require('cheerio');

const TARGET = 'https://unlimplay.com';
const PROXY_PATH = '/servpeli';
const STREAM_PATH = '/servpeli-stream';

const AD_SCRIPT_DOMAINS = [
  'googlesyndication.com', 'doubleclick.net', 'adnxs.com', 'popads.net',
  'popcash.net', 'trafficjunky.net', 'propellerads.com', 'juicyads.com',
  'hilltopads.net', 'traffichunt.com', 'plugrush.com', 'trafficstars.com',
  'adsterra.com', 'adtelligent.com', 'adskeeper.com', 'adspirit.de',
  'exoclick.com', 'exosrv.com', 'adform.net', 'adsrvr.org', 'adverticum.net',
  'revcontent.com', 'taboola.com', 'outbrain.com', 'mgid.com', 'bidvertiser.com',
  'zedo.com', 'clickadu.com', 'richpush.co', 'push.express', 'ilovefats.com',
  'vlitag.com', 'nuggad.net', 'geozo.com', 'serv00.net', 'cdn.bmcdn',
  'moonicorn', 'adskeeper', 'pushcrew', 'onesignal.com', 'pushnotif',
  'gravitymovie', 'js.ad',
];

const AD_SCRIPT_PATTERNS = [
  /window\.popunder/i,
  /popunder\s*=/i,
  /anti.?adblock/i,
  /googletag\.pubads/i,
  /googletag\.defineSlot/i,
  /_atsv/,
  /Notification\.requestPermission/i,
  /new\s+Worker\s*\(\s*['"]blob:/,
  /\.push\s*\(\s*function\s*\(\s*\)\s*\{\s*var\s+sw\s*=/,
];

const AD_EXACT_SELECTORS = [
  '.adsbygoogle',
  'ins[class="adsbygoogle"]',
  '[id="ad"]', '[id="ads"]', '[id="advertisement"]',
  '[id="banner-ad"]', '[id="ad-container"]', '[id="ad-wrapper"]',
  '[id="adsense"]', '[id="google-ads"]', '[id="dfp-ad"]',
  '[class="ad"]', '[class="ads"]',
  'div[class*="adsbygoogle"]',
  'div[id^="google_ads"]',
  'div[id^="div-gpt-ad"]',
  'div[id*="adsense"]',
  'div[id*="banner-ad"]',
  'div[id*="ad-container"]',
  'div[id*="ad-wrapper"]',
  '.overlay-ad', '.sticky-ad', '.popunder-overlay',
];

function isAdDomain(src) {
  if (!src) return false;
  return AD_SCRIPT_DOMAINS.some(d => src.includes(d));
}

function isAdScript(content) {
  if (!content) return false;
  return AD_SCRIPT_PATTERNS.some(p => p.test(content));
}

function rewriteStreamUrl(url) {
  return `${STREAM_PATH}?url=${encodeURIComponent(url)}`;
}

function resolveAbsoluteUrl(url, baseUrl) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function rewriteUrl(url, baseUrl) {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('#')) return url;
  if (url.startsWith('//')) url = 'https:' + url;
  if (url.match(/\.(m3u8|m3u)(\?|$)/i)) {
    const abs = resolveAbsoluteUrl(url, baseUrl);
    return rewriteStreamUrl(abs);
  }
  if (url.startsWith('https://unlimplay.com') || url.startsWith('http://unlimplay.com')) {
    const path = url.replace(/^https?:\/\/unlimplay\.com/, '');
    return PROXY_PATH + (path || '/');
  }
  if (url.startsWith('/')) {
    return PROXY_PATH + url;
  }
  if (!url.startsWith('http')) {
    try {
      const resolved = new URL(url, baseUrl);
      if (resolved.hostname === 'unlimplay.com') {
        return PROXY_PATH + resolved.pathname + resolved.search + resolved.hash;
      }
      return resolved.href;
    } catch {
      return PROXY_PATH + '/' + url;
    }
  }
  return url;
}

function rewriteM3u8InJs(js, pageUrl) {
  return js.replace(/(["'`])(https?:\/\/[^"'`\s\\]+\.m3u8[^"'`\s\\]*)(["'`])/gi, (match, q1, url, q3) => {
    return q1 + rewriteStreamUrl(url) + q3;
  });
}

function rewriteValueInJson(val) {
  if (typeof val === 'string') {
    // Rewrite m3u8 URLs
    if (/\.m3u8(\?|$)/i.test(val)) {
      return rewriteStreamUrl(val);
    }
    // Rewrite unlimplay.com absolute URLs to proxy
    if (val.startsWith('https://unlimplay.com') || val.startsWith('http://unlimplay.com')) {
      return val.replace(/https?:\/\/unlimplay\.com/, PROXY_PATH);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(rewriteValueInJson);
  }
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = rewriteValueInJson(v);
    }
    return out;
  }
  return val;
}

function rewriteJson(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr);
    const rewritten = rewriteValueInJson(obj);
    return JSON.stringify(rewritten);
  } catch {
    // Not valid JSON — try a regex fallback for m3u8 URLs
    return jsonStr.replace(/(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/gi, (url) => rewriteStreamUrl(url));
  }
}

function rewriteCss(css, pageUrl) {
  return css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (match, url) => {
    const rewritten = rewriteUrl(url.trim(), pageUrl);
    return `url('${rewritten}')`;
  });
}

function processM3u8Manifest(content, manifestUrl) {
  const lines = content.split('\n');
  const result = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith('#')) {
      return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
        const abs = resolveAbsoluteUrl(uri, manifestUrl);
        return `URI="${rewriteStreamUrl(abs)}"`;
      });
    }

    const abs = resolveAbsoluteUrl(trimmed, manifestUrl);
    return rewriteStreamUrl(abs);
  });
  return result.join('\n');
}

function cleanHtml(html, pageUrl) {
  const $ = cheerio.load(html, { decodeEntities: false });

  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const content = $(el).html() || '';
    if (isAdDomain(src) || isAdDomain(content) || isAdScript(content)) {
      $(el).remove();
    }
  });

  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      $(el).attr('src', rewriteUrl(src, pageUrl));
    } else {
      const content = $(el).html() || '';
      if (content.includes('.m3u8')) {
        $(el).html(rewriteM3u8InJs(content, pageUrl));
      }
    }
  });

  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (isAdDomain(src)) {
      $(el).remove();
    } else if (src) {
      $(el).attr('src', rewriteUrl(src, pageUrl));
    }
  });

  $('video[src]').each((_, el) => {
    const src = $(el).attr('src');
    $(el).attr('src', rewriteUrl(src, pageUrl));
  });

  $('source[src]').each((_, el) => {
    const src = $(el).attr('src');
    $(el).attr('src', rewriteUrl(src, pageUrl));
  });

  AD_EXACT_SELECTORS.forEach(sel => {
    try { $(sel).remove(); } catch {}
  });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const onclick = $(el).attr('onclick') || '';
    if (onclick.match(/window\.open|popunder|popup/i)) {
      $(el).removeAttr('onclick');
    }
    $(el).attr('href', rewriteUrl(href, pageUrl));
  });

  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    $(el).attr('href', rewriteUrl(href, pageUrl));
  });

  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    $(el).attr('src', rewriteUrl(src, pageUrl));
  });

  $('img[data-src]').each((_, el) => {
    const src = $(el).attr('data-src');
    $(el).attr('data-src', rewriteUrl(src, pageUrl));
  });

  $('form[action]').each((_, el) => {
    const action = $(el).attr('action');
    $(el).attr('action', rewriteUrl(action, pageUrl));
  });

  $('meta[http-equiv="refresh"]').remove();
  $('script[src*="cdn-cgi"]').remove();
  $('script[src*="cloudflare"]').remove();
  $('link[rel="preconnect"]').remove();
  $('link[rel="dns-prefetch"]').remove();

  const antiAdScript = `
<script>
(function() {
  var PROXY = '/servpeli';
  var STREAM = '/servpeli-stream';
  var TARGET_HOST = 'unlimplay.com';

  function rewriteAjaxUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    // Already proxied
    if (url.startsWith(PROXY) || url.startsWith(STREAM)) return url;
    // m3u8 → stream proxy
    if (/\\.m3u8(\\?|$)/i.test(url)) {
      var abs = url.startsWith('/') ? 'https://' + TARGET_HOST + url : url;
      return STREAM + '?url=' + encodeURIComponent(abs);
    }
    // Absolute URL to target
    if (url.indexOf('://' + TARGET_HOST) !== -1) {
      return url.replace(/https?:\\/\\/unlimplay\\.com/, PROXY);
    }
    // Protocol-relative
    if (url.startsWith('//' + TARGET_HOST)) {
      return url.replace('//' + TARGET_HOST, PROXY);
    }
    // Relative URL
    if (url.startsWith('/')) {
      return PROXY + url;
    }
    return url;
  }

  // Patch fetch
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      if (typeof input === 'string') input = rewriteAjaxUrl(input);
      else if (input && input.url) input = new Request(rewriteAjaxUrl(input.url), input);
    } catch(e) {}
    return _fetch.apply(this, [input, init]);
  };

  // Patch XHR
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
    try { url = rewriteAjaxUrl(url); } catch(e) {}
    return _open.call(this, method, url, async !== undefined ? async : true, user, pass);
  };

  // Block ads
  window.open = function() { return null; };
  try { Object.defineProperty(document, 'onvisibilitychange', { set: function(){} }); } catch(e) {}
  window.addEventListener('blur', function(e) { e.stopImmediatePropagation(); }, true);
})();
</script>`;
  $('head').prepend(antiAdScript);

  $('style').each((_, el) => {
    const content = $(el).html() || '';
    $(el).html(rewriteCss(content, pageUrl));
  });

  return $.html();
}

function buildRequestHeaders(req, referer) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': req.headers['accept'] || '*/*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
    'Referer': referer || TARGET + '/',
    'Origin': TARGET,
  };
  // Forward client cookies so Cloudflare session tokens are passed through
  if (req.headers['cookie']) {
    headers['Cookie'] = req.headers['cookie'];
  }
  if (req.headers['x-requested-with']) {
    headers['X-Requested-With'] = req.headers['x-requested-with'];
  }
  return headers;
}

const SKIP_HEADERS = [
  'content-encoding', 'transfer-encoding', 'connection',
  'x-frame-options', 'content-security-policy', 'speculation-rules',
  'cf-ray', 'cf-cache-status', 'cf-connecting-ip', 'alt-svc',
  'report-to', 'nel', 'server',
  'access-control-allow-origin', 'access-control-allow-credentials',
  'access-control-allow-methods', 'access-control-expose-headers',
];

function forwardHeaders(srcHeaders, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  Object.entries(srcHeaders).forEach(([k, v]) => {
    const key = k.toLowerCase();
    if (SKIP_HEADERS.includes(key)) return;
    // Forward Set-Cookie so browser stores Cloudflare session tokens
    if (key === 'set-cookie') {
      const cookies = Array.isArray(v) ? v : [v];
      // Strip Secure/SameSite flags so cookie works over proxy
      const stripped = cookies.map(c =>
        c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=[^;]*/gi, '; SameSite=None')
      );
      res.setHeader('Set-Cookie', stripped);
      return;
    }
    res.setHeader(k, v);
  });
}

async function proxyServpeli(req, res) {
  const subPath = req.params[0] || '';
  const queryString = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : '';
  const targetUrl = `${TARGET}/${subPath}${queryString}`;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).end();
  }

  try {
    const reqHeaders = buildRequestHeaders(req, TARGET + '/');
    const reqContentType = req.headers['content-type'];
    if (reqContentType) reqHeaders['Content-Type'] = reqContentType;

    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: reqHeaders,
      responseType: 'arraybuffer',
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      axiosConfig.data = typeof req.body === 'object'
        ? JSON.stringify(req.body)
        : req.body;
    }

    const response = await axios(axiosConfig);

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    forwardHeaders(response.headers, res);

    if (contentType.includes('text/html')) {
      const html = response.data.toString('utf-8');
      const clean = cleanHtml(html, targetUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.removeHeader('content-length');
      return res.status(response.status).send(clean);
    }

    if (contentType.includes('text/css')) {
      const css = response.data.toString('utf-8');
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.removeHeader('content-length');
      return res.status(response.status).send(rewriteCss(css, targetUrl));
    }

    if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
      let js = response.data.toString('utf-8');
      js = js.replace(/https?:\/\/unlimplay\.com/g, PROXY_PATH);
      js = rewriteM3u8InJs(js, targetUrl);
      res.setHeader('Content-Type', contentType);
      res.removeHeader('content-length');
      return res.status(response.status).send(js);
    }

    // Rewrite m3u8 URLs inside JSON API responses (e.g. server-list AJAX calls)
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      const jsonStr = response.data.toString('utf-8');
      const rewritten = rewriteJson(jsonStr);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.removeHeader('content-length');
      return res.status(response.status).send(rewritten);
    }

    return res.status(response.status).send(response.data);

  } catch (err) {
    console.error(`[servpeli] Error proxying ${targetUrl}:`, err.message);
    res.status(502).json({ error: 'Error al conectar con el servidor de películas', detalle: err.message });
  }
}

async function proxyServpeliStream(req, res) {
  const rawUrl = req.query.url;
  if (!rawUrl) {
    return res.status(400).json({ error: 'Parámetro ?url= requerido' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(rawUrl);
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  try {
    const referer = targetUrl.startsWith('https://unlimplay.com') ? TARGET + '/' : targetUrl;
    const response = await axios.get(targetUrl, {
      headers: buildRequestHeaders(req, referer),
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    const isM3u8 = contentType.includes('mpegurl') || contentType.includes('x-mpegurl') ||
                   targetUrl.match(/\.m3u8(\?|$)/i) || contentType.includes('application/vnd.apple');

    forwardHeaders(response.headers, res);
    res.removeHeader('content-length');

    if (isM3u8) {
      const manifest = response.data.toString('utf-8');
      const processed = processM3u8Manifest(manifest, targetUrl);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      console.log(`[servpeli-stream] M3U8 proxied: ${targetUrl}`);
      return res.status(200).send(processed);
    }

    res.status(response.status).send(response.data);

  } catch (err) {
    console.error(`[servpeli-stream] Error proxying stream ${targetUrl}:`, err.message);
    res.status(502).json({ error: 'Error al obtener el stream', detalle: err.message, url: targetUrl });
  }
}

// Dominios filemoon (extracción HTTP propia, sin browser)
const FILEMOON_DOMAINS = [
  'bysejikuar.com', 'filemoon.sx', 'filemoon.to', 'filemoon.in',
  'bysedikamoum.com', 'moonembed.com', 'filemoonembed.com',
  'moonfeel.com', 'kerapoxy.cc', 'ridoo.net'
];

// Dominios vidhide
const VIDHIDE_DOMAINS = ['vidhide.com', 'vidhidepro.com', 'vidhideplus.com', 'vid.gg', 'vidhide.in'];

// Dominios filelions
const FILELIONS_DOMAINS = ['filelions.com', 'filelions.to', 'filelions.live', 'filelions.site', 'filelions.online'];

// Dominios streamwish
const STREAMWISH_DOMAINS = [
  'streamwish.to', 'streamwish.com', 'streamwish.site', 'streamwish.pro',
  'hglink.to', 'sfastwish.com', 'awish.live', 'strwish.com',
  'wish4you.online', 'wishfast.top', 'embedwish.com', 'flaswish.com',
  'playerwish.com', 'swdyu.com', 'hlsplay.pro'
];

function isFilemoon(url) {
  try { return FILEMOON_DOMAINS.some(d => new URL(url).hostname.endsWith(d)); } catch { return false; }
}
function isVidhide(url) {
  try { return VIDHIDE_DOMAINS.some(d => new URL(url).hostname.endsWith(d)); } catch { return false; }
}
function isFilelions(url) {
  try { return FILELIONS_DOMAINS.some(d => new URL(url).hostname.endsWith(d)); } catch { return false; }
}
function isStreamwish(url) {
  try { return STREAMWISH_DOMAINS.some(d => new URL(url).hostname.endsWith(d)); } catch { return false; }
}

function needsBrowser(url) {
  return false; // ahora todo se maneja con HTTP
}

function containsM3u8(url) {
  if (!url) return false;
  if (/\.m3u8/i.test(url)) return true;
  try { if (/\.m3u8/i.test(decodeURIComponent(url))) return true; } catch {}
  return false;
}

const unlimplayCache = new Map();
const UNLIMPLAY_TTL = 2 * 60 * 60 * 1000; // 2 horas — tokens m3u8 duran ~12h

// Registro de IDs solicitados para auto-refresh del cron
const unlimplayRegistry = new Map(); // cacheKey → { type, args }

function _register(cacheKey, type, args) {
  unlimplayRegistry.set(cacheKey, { type, args });
}

async function refreshUnlimplayCache() {
  if (unlimplayRegistry.size === 0) return;
  console.log(`🔄 [unlimplay] Auto-refresh de ${unlimplayRegistry.size} entradas en caché...`);
  let ok = 0, fail = 0;
  for (const [cacheKey, meta] of unlimplayRegistry.entries()) {
    try {
      if (meta.type === 'movie') {
        await scrapUnlimplayM3u8(meta.args[0], true);
      } else if (meta.type === 'tv') {
        await scrapUnlimplayM3u8Tv(...meta.args, true);
      }
      ok++;
    } catch (e) {
      fail++;
      console.warn(`⚠️ [unlimplay] No se pudo refrescar ${cacheKey}: ${e.message}`);
    }
  }
  console.log(`✅ [unlimplay] Refresh completado: ${ok} ok, ${fail} fallidos`);
}

const UNLIMPLAY_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Referer': `${TARGET}/`,
};

function extractEmbedsFromHtml(html) {
  // Buscar const EMBEDS = {...}; con match balanceado de llaves
  const start = html.indexOf('const EMBEDS = ');
  if (start === -1) return null;

  const jsonStart = html.indexOf('{', start);
  if (jsonStart === -1) return null;

  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) { jsonEnd = i; break; }
    }
  }
  if (jsonEnd === -1) return null;

  try {
    const raw = JSON.parse(html.slice(jsonStart, jsonEnd + 1));
    // Normalizar: los valores pueden ser strings o {url, tipo}
    const normalized = {};
    for (const [lang, servers] of Object.entries(raw)) {
      normalized[lang] = {};
      for (const [name, val] of Object.entries(servers)) {
        if (typeof val === 'string') {
          normalized[lang][name] = val;
        } else if (val && typeof val === 'object' && val.url) {
          normalized[lang][name] = val.url;
          if (val.tipo) normalized[lang][`${name}__tipo`] = val.tipo;
        }
      }
    }
    return normalized;
  } catch {
    return null;
  }
}

// ─── Extractores específicos por servidor ─────────────────────────────────────

// ── VOE.sx extractor ──────────────────────────────────────────────────────────
function isVoe(url) {
  return /voe\.sx|voe\d*\.net|voe\d*\.me|voe\d*\.io/i.test(url);
}

async function extractVoe(embedUrl, referer, cookieHeader) {
  // ── Intento 1: HTTP directo con cookies (si el usuario las provee) ────────────
  if (cookieHeader) {
    try {
      const res = await axios.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
          'Referer': referer || 'https://voe.sx/',
          'Cookie': cookieHeader,
        },
        timeout: 20000,
        maxRedirects: 5,
      });
      const html = res.data;
      const m3u8 = _parseVoeHtml(html);
      if (m3u8) {
        console.log(`[voe] m3u8 via cookies HTTP: ${m3u8}`);
        return { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl, method: 'cookies' };
      }
    } catch (e) {
      console.warn(`[voe] HTTP con cookies falló: ${e.message}`);
    }
  }

  // ── Intento 2: Puppeteer con stealth patches para bypassar hCaptcha ───────────
  const puppeteer = require('puppeteer-core');
  const chromePath = getChromiumPath();
  if (!chromePath) return { ok: false, error: 'Chromium no disponible para VOE', embedUrl };

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--no-first-run', '--mute-audio',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1280,720',
      ],
      timeout: 45000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // Stealth: parchear propiedades que delatan headless/bot antes de cargar cualquier página
    await page.evaluateOnNewDocument(() => {
      // Eliminar webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // Simular plugins reales
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const arr = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          arr.__proto__ = PluginArray.prototype;
          return arr;
        }
      });

      // Simular idiomas
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'es'] });

      // Simular hardwareConcurrency y deviceMemory
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

      // chrome object (necesario para hCaptcha)
      window.chrome = {
        app: { isInstalled: false },
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
      };

      // Permissions API — hCaptcha la chequea
      const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
      if (originalQuery) {
        window.navigator.permissions.query = (params) =>
          params.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(params);
      }

      // Ocultar que es headless en toString
      const nativeToStringFn = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (this === window.navigator.permissions.query) return 'function query() { [native code] }';
        return nativeToStringFn.call(this);
      };
    });

    let m3u8Found = null;
    let resolveM3u8;
    const m3u8Promise = new Promise(r => { resolveM3u8 = r; });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      const rt = req.resourceType();
      // Bloquear sólo imágenes (NO bloquear scripts/fetch/xhr que hCaptcha necesita)
      if (rt === 'image' && !u.includes('hcaptcha') && !u.includes('voe')) {
        req.abort();
        return;
      }
      req.continue();
    });

    page.on('response', (resp) => {
      const u = resp.url();
      if (u.includes('.m3u8') && !u.includes('seg-') && !u.includes('index-') && !u.includes('ad')) {
        m3u8Found = u;
        if (resolveM3u8) resolveM3u8(u);
      }
    });

    if (referer) await page.setExtraHTTPHeaders({ Referer: referer });

    console.log(`[voe] Navegando con stealth: ${embedUrl}`);
    try {
      await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 40000 });
    } catch (e) {
      // networkidle2 puede timeout si hay scripts cargando permanentemente; continuar igual
      console.log(`[voe] Nav note: ${e.message}`);
    }

    // Esperar hasta 20s para que DDoS-Guard + hCaptcha resuelvan y el video aparezca
    await Promise.race([m3u8Promise, new Promise(r => setTimeout(r, 20000))]);

    // Si no capturamos m3u8 vía red, parsear HTML de la página resultante
    if (!m3u8Found) {
      const content = await page.content();
      m3u8Found = _parseVoeHtml(content);

      // Si la página sigue mostrando DDoS/captcha, intentar esperar un poco más
      if (!m3u8Found && (content.includes('ddos-guard') || content.includes('hcaptcha'))) {
        console.log('[voe] Todavía en captcha/ddos, esperando 10s adicionales...');
        await new Promise(r => setTimeout(r, 10000));
        await Promise.race([m3u8Promise, new Promise(r => setTimeout(r, 8000))]);
        if (!m3u8Found) {
          const content2 = await page.content();
          m3u8Found = _parseVoeHtml(content2);
        }
      }

      // Intentar extraer vía JS en contexto de página
      if (!m3u8Found) {
        try {
          m3u8Found = await page.evaluate(() => {
            try { if (typeof wc8p !== 'undefined') return atob(wc8p); } catch(e) {}
            for (const k of Object.keys(window)) {
              try {
                const v = window[k];
                if (typeof v === 'string' && v.includes('.m3u8') && v.startsWith('http')) return v;
              } catch(e) {}
            }
            return null;
          });
        } catch(e) {}
      }
    }

    if (m3u8Found) {
      console.log(`[voe] m3u8 encontrado: ${m3u8Found}`);
      // Capturar cookies de sesión para devolver al cliente (puede reusar)
      const cookies = await page.cookies();
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      return {
        ok: true,
        m3u8: m3u8Found,
        m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8Found)}`,
        embedUrl,
        method: 'browser',
        session_cookies: cookieStr || undefined,
      };
    }

    return { ok: false, error: 'VOE: hCaptcha requiere intervención manual. Usa ?cookies= con tus cookies de voe.sx para bypassarlo.', embedUrl };
  } catch (err) {
    return { ok: false, error: `VOE browser error: ${err.message}`, embedUrl };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// Parsear HTML de VOE para extraer m3u8 por varios patrones conocidos
function _parseVoeHtml(html) {
  if (!html) return null;

  // Patrón 1: wc8p = "BASE64" (VOE codifica la URL HLS en base64)
  const wc8pMatch = html.match(/wc8p\s*=\s*["']([A-Za-z0-9+/=]{20,})["']/);
  if (wc8pMatch) {
    try {
      const decoded = Buffer.from(wc8pMatch[1], 'base64').toString('utf-8');
      if (decoded.includes('.m3u8') || decoded.startsWith('http')) return decoded.trim();
    } catch {}
  }

  // Patrón 2: atob("BASE64") genérico
  for (const m of html.matchAll(/atob\s*\(\s*["']([A-Za-z0-9+/=]{20,})["']\s*\)/g)) {
    try {
      const decoded = Buffer.from(m[1], 'base64').toString('utf-8');
      if (decoded.includes('.m3u8') || (decoded.startsWith('http') && decoded.includes('voe'))) return decoded.trim();
    } catch {}
  }

  // Patrón 3: hls / m3u8 directo en strings JS
  const hlsMatch = html.match(/["']hls["']\s*:\s*["'](https?[^"']+\.m3u8[^"']*)["']/i)
                || html.match(/hls\s*:\s*["'](https?[^"']+\.m3u8[^"']*)["']/i)
                || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
  if (hlsMatch) return hlsMatch[1];

  return null;
}

async function extractFilemoon(embedUrl, referer) {
  try {
    const res = await axios.get(embedUrl, {
      headers: { ...EMBED_HEADERS, Referer: referer || TARGET + '/' },
      timeout: 15000,
      maxRedirects: 5,
    });
    const html = res.data;

    // Buscar m3u8 directamente
    let m3u8 = findM3u8InText(html);

    if (!m3u8) {
      // Desempaquetar JS eval-packed (filemoon usa p,a,c,k)
      const unpacked = unpackEvalJs(html);
      if (unpacked) {
        m3u8 = findM3u8InText(unpacked);
        if (!m3u8) {
          const src = unpacked.match(/"file"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/i);
          if (src) m3u8 = src[1];
        }
      }
    }

    if (!m3u8) {
      // Patrón sources:[{file:"..."}]
      const src = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*["']([^"']+\.m3u8[^"']*)['"]/i)
                || html.match(/"file"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/i);
      if (src) m3u8 = src[1];
    }

    if (m3u8) {
      return { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl };
    }
    return { ok: false, error: 'No se encontró m3u8 en filemoon', embedUrl };
  } catch (err) {
    return { ok: false, error: `Filemoon HTTP: ${err.message}`, embedUrl };
  }
}

async function extractVidhide(embedUrl, referer) {
  try {
    const match = embedUrl.match(/\/(?:v|e|f)\/([a-zA-Z0-9]+)/);
    if (!match) return { ok: false, error: 'ID no encontrado en URL vidhide', embedUrl };
    const videoId = match[1];
    const host = new URL(embedUrl).origin;
    const res = await axios.post(
      `${host}/api/source/${videoId}`,
      `r=${encodeURIComponent(referer || '')}&d=${new URL(embedUrl).hostname}`,
      {
        headers: {
          ...EMBED_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': embedUrl,
          'Origin': host,
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    );
    const data = res.data;
    if (data && data.success && Array.isArray(data.data)) {
      const hls = data.data.find(s => s.type === 'hls' || (s.file || '').includes('.m3u8'))
                || data.data.find(s => s.file);
      if (hls && hls.file) {
        const isM = hls.file.includes('.m3u8');
        return {
          ok: true,
          m3u8: hls.file,
          m3u8_proxied: isM ? `/servpeli-stream?url=${encodeURIComponent(hls.file)}` : null,
          embedUrl
        };
      }
    }
    // Fallback HTML
    const htmlRes = await axios.get(embedUrl, {
      headers: { ...EMBED_HEADERS, Referer: referer || TARGET + '/' },
      timeout: 15000,
    });
    const m3u8 = findM3u8InText(htmlRes.data) || findM3u8InText(unpackEvalJs(htmlRes.data));
    if (m3u8) return { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl };
    return { ok: false, error: 'API vidhide no retornó m3u8', embedUrl };
  } catch (err) {
    return { ok: false, error: `Vidhide: ${err.message}`, embedUrl };
  }
}

async function extractFilelions(embedUrl, referer) {
  try {
    const match = embedUrl.match(/\/(?:v|e|f)\/([a-zA-Z0-9]+)/);
    if (!match) return { ok: false, error: 'ID no encontrado en URL filelions', embedUrl };
    const videoId = match[1];
    const host = new URL(embedUrl).origin;
    const res = await axios.post(
      `${host}/api/source/${videoId}`,
      `r=${encodeURIComponent(referer || '')}&d=${new URL(embedUrl).hostname}`,
      {
        headers: {
          ...EMBED_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': embedUrl,
          'Origin': host,
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    );
    const data = res.data;
    if (data && data.success && Array.isArray(data.data)) {
      const hls = data.data.find(s => s.type === 'hls' || (s.file || '').includes('.m3u8'))
                || data.data.find(s => s.file);
      if (hls && hls.file) {
        const isM = hls.file.includes('.m3u8');
        return {
          ok: true,
          m3u8: hls.file,
          m3u8_proxied: isM ? `/servpeli-stream?url=${encodeURIComponent(hls.file)}` : null,
          embedUrl
        };
      }
    }
    // Fallback HTML
    const htmlRes = await axios.get(embedUrl, {
      headers: { ...EMBED_HEADERS, Referer: referer || TARGET + '/' },
      timeout: 15000,
    });
    const m3u8 = findM3u8InText(htmlRes.data) || findM3u8InText(unpackEvalJs(htmlRes.data));
    if (m3u8) return { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl };
    return { ok: false, error: 'API filelions no retornó m3u8', embedUrl };
  } catch (err) {
    return { ok: false, error: `Filelions: ${err.message}`, embedUrl };
  }
}

async function extractStreamwish(embedUrl, referer) {
  try {
    // Intentar API POST primero (mismo patrón que filelions/vidhide)
    const match = embedUrl.match(/\/(?:v|e|f)\/([a-zA-Z0-9]+)/);
    if (match) {
      const videoId = match[1];
      const host = new URL(embedUrl).origin;
      try {
        const apiRes = await axios.post(
          `${host}/api/source/${videoId}`,
          `r=${encodeURIComponent(referer || '')}&d=${new URL(embedUrl).hostname}`,
          {
            headers: {
              ...EMBED_HEADERS,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': embedUrl,
              'Origin': host,
              'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 12000,
          }
        );
        const data = apiRes.data;
        if (data && data.success && Array.isArray(data.data)) {
          const hls = data.data.find(s => s.type === 'hls' || (s.file || '').includes('.m3u8'))
                    || data.data.find(s => s.file);
          if (hls && hls.file) {
            const isM = hls.file.includes('.m3u8');
            return {
              ok: true,
              m3u8: hls.file,
              m3u8_proxied: isM ? `/servpeli-stream?url=${encodeURIComponent(hls.file)}` : null,
              embedUrl
            };
          }
        }
      } catch {}
    }

    // Fallback: scraping de la página embed
    const res = await axios.get(embedUrl, {
      headers: { ...EMBED_HEADERS, Referer: referer || TARGET + '/' },
      timeout: 15000,
      maxRedirects: 5,
    });
    const html = res.data;

    // Buscar m3u8 directo
    let m3u8 = findM3u8InText(html);

    if (!m3u8) {
      // Streamwish usa eval-packed JS en algunos mirrors
      const unpacked = unpackEvalJs(html);
      if (unpacked) m3u8 = findM3u8InText(unpacked);
    }

    if (!m3u8) {
      // Patrón JWPlayer: sources:[{file:"..."}]
      const jwMatch = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*["']([^"']+\.m3u8[^"']*)['"]/i)
                   || html.match(/"file"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/i)
                   || html.match(/file\s*:\s*["'](https?:[^"']+\.m3u8[^"']*)['"]/i);
      if (jwMatch) m3u8 = jwMatch[1];
    }

    if (!m3u8) {
      // Patrón m3u8 en cualquier atributo
      const anyMatch = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
      if (anyMatch) m3u8 = anyMatch[1];
    }

    if (m3u8) {
      return { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl };
    }
    return { ok: false, error: 'No se encontró m3u8 en streamwish', embedUrl };
  } catch (err) {
    return { ok: false, error: `Streamwish: ${err.message}`, embedUrl };
  }
}

async function scrapUnlimplayM3u8(movieId, forceRefresh = false) {
  const cacheKey = `unlimplay_${movieId}`;
  _register(cacheKey, 'movie', [movieId]);
  if (!forceRefresh) {
    const cached = unlimplayCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < UNLIMPLAY_TTL) return cached.data;
  }

  // Paso 1: Llamar al PHP API para disparar el scraping fresco
  let phpData = null;
  try {
    const phpUrl = `${TARGET}/play.php/embed/movie/${movieId}?api=1&t=${Date.now()}`;
    const phpRes = await axios.get(phpUrl, {
      headers: {
        ...UNLIMPLAY_HEADERS,
        'Accept': 'application/json, text/javascript, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${TARGET}/play/embed/movie/${movieId}`,
      },
      timeout: 25000,
      maxRedirects: 5,
    });
    if (phpRes.data && phpRes.data.success) {
      phpData = phpRes.data;
      console.log(`[unlimplay] PHP API: ${phpData.total_servers} servidores, fuente: ${phpData.source}`);
    }
  } catch (e) {
    console.warn(`[unlimplay] PHP API falló (no crítico): ${e.message}`);
  }

  // Paso 2: Obtener página /f/embed/ que tiene el m3u8 directo embebido
  const fEmbedUrl = `${TARGET}/f/embed/movie/${movieId}`;
  const htmlRes = await axios.get(fEmbedUrl, {
    headers: { ...UNLIMPLAY_HEADERS, 'Accept': 'text/html,application/xhtml+xml' },
    timeout: 20000,
    maxRedirects: 5,
  });

  const html = htmlRes.data;
  const embeds = extractEmbedsFromHtml(html);

  if (!embeds) {
    // Sin EMBEDS pero PHP dio embed_urls — devolver esos
    if (phpData && phpData.data && phpData.data.length > 0) {
      const result = {
        movie_id: movieId,
        fuente: 'unlimplay.com',
        actualizado: new Date().toISOString(),
        php_api: phpData.source,
        idiomas: {}
      };
      for (const item of phpData.data) {
        result.idiomas[item.language] = {
          embed_url: item.embed_url,
          servidores: [{ nombre: 'embed', url: item.embed_url, tipo: 'embed' }]
        };
      }
      unlimplayCache.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }
    throw new Error('No se encontró EMBEDS en la página y PHP API no retornó datos');
  }

  // Construir resultado organizado
  const result = {
    movie_id: movieId,
    fuente: 'unlimplay.com',
    actualizado: new Date().toISOString(),
    php_api: phpData ? phpData.source : null,
    idiomas: {}
  };

  for (const [idioma, servidores] of Object.entries(embeds)) {
    result.idiomas[idioma] = { servidores: [] };

    for (const [nombre, url] of Object.entries(servidores)) {
      if (typeof url !== 'string') continue;
      if (nombre.endsWith('__tipo')) continue;
      if (nombre === 'proxy') continue;
      const isM3u8 = containsM3u8(url);
      const tipoHint = servidores[`${nombre}__tipo`] || null;
      const tipo = isM3u8 ? 'm3u8_directo' : (tipoHint || 'embed');
      const entry = { nombre, url, tipo };
      if (isM3u8) {
        entry.m3u8_proxied = `/servpeli-stream?url=${encodeURIComponent(url)}`;
      }
      result.idiomas[idioma].servidores.push(entry);
    }

    const directEntry = result.idiomas[idioma].servidores.find(s => s.nombre === 'direct');
    if (directEntry) {
      result.idiomas[idioma].m3u8 = directEntry.url;
      result.idiomas[idioma].m3u8_proxied = directEntry.m3u8_proxied;
    }
    const proxyEntry = result.idiomas[idioma].servidores.find(s => s.nombre === 'proxy');
    if (proxyEntry) {
      result.idiomas[idioma].proxy_stream = proxyEntry.url;
    }
  }

  // Agregar embed_urls del PHP API si están disponibles
  if (phpData && phpData.data) {
    for (const item of phpData.data) {
      if (result.idiomas[item.language]) {
        result.idiomas[item.language].embed_url = item.embed_url;
      }
    }
  }

  // Resolver m3u8 para todos los servidores (filemoon, vidhide, filelions incluidos)
  const resolveServer = async (servidor) => {
    if (servidor.tipo === 'm3u8_directo') return servidor;
    try {
      const extracted = await extractM3u8FromEmbed(servidor.url, `${TARGET}/`);
      if (extracted.ok) {
        return { ...servidor, m3u8: extracted.m3u8, m3u8_proxied: extracted.m3u8_proxied, tipo: 'm3u8_directo' };
      }
    } catch {}
    return servidor;
  };

  for (const idioma of Object.keys(result.idiomas)) {
    result.idiomas[idioma].servidores = await Promise.all(
      result.idiomas[idioma].servidores.map(resolveServer)
    );
  }

  unlimplayCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

async function scrapUnlimplayM3u8Tv(seriesId, season, episode, forceRefresh = false) {
  const cacheKey = `unlimplay_tv_${seriesId}_${season}_${episode}`;
  _register(cacheKey, 'tv', [seriesId, season, episode]);
  if (!forceRefresh) {
    const cached = unlimplayCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < UNLIMPLAY_TTL) return cached.data;
  }

  // Paso 1: PHP API para disparar scraping fresco
  let phpData = null;
  try {
    const phpUrl = `${TARGET}/play.php/embed/tv/${seriesId}/${season}/${episode}?api=1&t=${Date.now()}`;
    const phpRes = await axios.get(phpUrl, {
      headers: {
        ...UNLIMPLAY_HEADERS,
        'Accept': 'application/json, text/javascript, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${TARGET}/play/embed/tv/${seriesId}/${season}/${episode}`,
      },
      timeout: 25000,
      maxRedirects: 5,
    });
    if (phpRes.data && phpRes.data.success) {
      phpData = phpRes.data;
      console.log(`[unlimplay/tv] PHP API: ${phpData.total_servers} servidores, fuente: ${phpData.source}`);
    }
  } catch (e) {
    console.warn(`[unlimplay/tv] PHP API falló (no crítico): ${e.message}`);
  }

  // Paso 2: Página /f/embed/tv/ con EMBEDS embebido
  const fEmbedUrl = `${TARGET}/f/embed/tv/${seriesId}/${season}/${episode}`;
  const htmlRes = await axios.get(fEmbedUrl, {
    headers: { ...UNLIMPLAY_HEADERS, 'Accept': 'text/html,application/xhtml+xml' },
    timeout: 20000,
    maxRedirects: 5,
  });

  const html = htmlRes.data;
  const embeds = extractEmbedsFromHtml(html);

  if (!embeds) {
    if (phpData && phpData.data && phpData.data.length > 0) {
      const result = {
        series_id: seriesId,
        season: parseInt(season),
        episode: parseInt(episode),
        tipo: 'tv',
        fuente: 'unlimplay.com',
        actualizado: new Date().toISOString(),
        php_api: phpData.source,
        idiomas: {}
      };
      for (const item of phpData.data) {
        result.idiomas[item.language] = {
          embed_url: item.embed_url,
          servidores: [{ nombre: 'embed', url: item.embed_url, tipo: 'embed' }]
        };
      }
      unlimplayCache.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }
    throw new Error('No se encontró EMBEDS en la página y PHP API no retornó datos');
  }

  const result = {
    series_id: seriesId,
    season: parseInt(season),
    episode: parseInt(episode),
    tipo: 'tv',
    fuente: 'unlimplay.com',
    actualizado: new Date().toISOString(),
    php_api: phpData ? phpData.source : null,
    idiomas: {}
  };

  for (const [idioma, servidores] of Object.entries(embeds)) {
    result.idiomas[idioma] = { servidores: [] };

    for (const [nombre, url] of Object.entries(servidores)) {
      if (typeof url !== 'string') continue;
      if (nombre.endsWith('__tipo')) continue;
      if (nombre === 'proxy') continue;
      const isM3u8 = containsM3u8(url);
      const tipoHint = servidores[`${nombre}__tipo`] || null;
      const tipo = isM3u8 ? 'm3u8_directo' : (tipoHint || 'embed');
      const entry = { nombre, url, tipo };
      if (isM3u8) {
        entry.m3u8_proxied = `/servpeli-stream?url=${encodeURIComponent(url)}`;
      }
      result.idiomas[idioma].servidores.push(entry);
    }

    const directEntry = result.idiomas[idioma].servidores.find(s => s.nombre === 'direct');
    if (directEntry) {
      result.idiomas[idioma].m3u8 = directEntry.url;
      result.idiomas[idioma].m3u8_proxied = directEntry.m3u8_proxied;
    }
  }

  // Agregar embed_urls del PHP API si están disponibles
  if (phpData && phpData.data) {
    for (const item of phpData.data) {
      if (result.idiomas[item.language]) {
        result.idiomas[item.language].embed_url = item.embed_url;
      }
    }
  }

  // Resolver m3u8 para todos los servidores (filemoon, vidhide, filelions incluidos)
  const resolveServer = async (servidor) => {
    if (servidor.tipo === 'm3u8_directo') return servidor;
    try {
      const extracted = await extractM3u8FromEmbed(servidor.url, `${TARGET}/`);
      if (extracted.ok) {
        return { ...servidor, m3u8: extracted.m3u8, m3u8_proxied: extracted.m3u8_proxied, tipo: 'm3u8_directo' };
      }
    } catch {}
    return servidor;
  };

  for (const idioma of Object.keys(result.idiomas)) {
    result.idiomas[idioma].servidores = await Promise.all(
      result.idiomas[idioma].servidores.map(resolveServer)
    );
  }

  unlimplayCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

const embedM3u8Cache = new Map();
const EMBED_TTL = 8 * 60 * 1000;

function getChromiumPath() {
  const { execSync } = require('child_process');
  try { return execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null').toString().trim(); } catch { return null; }
}

async function extractM3u8WithBrowser(embedUrl, referer) {
  const puppeteer = require('puppeteer-core');
  const chromePath = getChromiumPath();
  if (!chromePath) return { ok: false, error: 'Chromium no disponible', embedUrl };

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--no-first-run', '--disable-extensions', '--mute-audio',
        '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'
      ],
      timeout: 30000
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setExtraHTTPHeaders({ Referer: referer || 'https://unlimplay.com/' });

    let m3u8 = null;

    const found = new Promise((resolve) => {
      page.on('request', req => {
        const u = req.url();
        if (u.includes('master.m3u8') || (u.includes('.m3u8') && !u.includes('index-') && !u.includes('seg-'))) {
          m3u8 = u; resolve(u);
        }
      });
    });

    await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Esperar hasta que se encuentre el m3u8 o timeout de 15s
    await Promise.race([found, new Promise(r => setTimeout(r, 15000))]);

    if (!m3u8) {
      // Intentar click en el video para iniciar reproducción
      try { await page.click('video, .play-button, [class*="play"], button[class*="play"]'); } catch {}
      await Promise.race([found, new Promise(r => setTimeout(r, 8000))]);
    }

    if (m3u8) {
      return { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl };
    }
    return { ok: false, error: 'No se encontró m3u8 en la página (browser)', embedUrl };
  } catch (err) {
    return { ok: false, error: `Browser error: ${err.message}`, embedUrl };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function unpackEvalJs(html) {
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const script of scripts) {
    if (!script.includes('eval(function(p,a,c,k')) continue;
    try {
      const vm = require('vm');
      let captured = '';
      const ctx = vm.createContext({
        eval: (code) => { captured = code; },
        document: { cookie: '' },
        window: {},
        location: { hostname: '' }
      });
      const safeCode = script.replace(/<\/?script[^>]*>/g, '');
      vm.runInContext(safeCode, ctx, { timeout: 3000 });
      if (captured) return captured;
    } catch {}
  }
  return null;
}

function findM3u8InText(text) {
  if (!text) return null;
  const matches = text.match(/https?:\/\/[^\s"'\\]+\.m3u8(?:\?[^\s"'\\]*)?/g);
  return matches ? matches[0] : null;
}

const EMBED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
};

async function extractM3u8FromEmbed(embedUrl, referer) {
  const cacheKey = `embed_${embedUrl}`;
  const cached = embedM3u8Cache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < EMBED_TTL) return cached.data;

  let result;

  // Routers específicos por dominio
  if (isVoe(embedUrl)) {
    console.log(`[embed/m3u8] VOE.sx browser: ${embedUrl}`);
    result = await extractVoe(embedUrl, referer);
    embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  if (isFilemoon(embedUrl)) {
    console.log(`[embed/m3u8] Filemoon HTTP: ${embedUrl}`);
    result = await extractFilemoon(embedUrl, referer);
    // Si falla HTTP, intentar browser como último recurso
    if (!result.ok) {
      console.log(`[embed/m3u8] Filemoon HTTP falló, intentando browser: ${embedUrl}`);
      result = await extractM3u8WithBrowser(embedUrl, referer);
    }
    embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  if (isVidhide(embedUrl)) {
    console.log(`[embed/m3u8] Vidhide: ${embedUrl}`);
    result = await extractVidhide(embedUrl, referer);
    embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  if (isFilelions(embedUrl)) {
    console.log(`[embed/m3u8] Filelions: ${embedUrl}`);
    result = await extractFilelions(embedUrl, referer);
    embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  if (isStreamwish(embedUrl)) {
    console.log(`[embed/m3u8] Streamwish: ${embedUrl}`);
    result = await extractStreamwish(embedUrl, referer);
    embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  // Extracción HTTP general
  let html;
  try {
    const res = await axios.get(embedUrl, {
      headers: { ...EMBED_HEADERS, Referer: referer || TARGET + '/' },
      timeout: 15000,
      maxRedirects: 5,
    });
    html = res.data;
  } catch (err) {
    result = { ok: false, error: `HTTP ${err.response?.status || err.message}`, embedUrl };
    embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  let m3u8 = findM3u8InText(html);

  if (!m3u8) {
    const unpacked = unpackEvalJs(html);
    if (unpacked) {
      m3u8 = findM3u8InText(unpacked);
      if (!m3u8) {
        const linksMatch = unpacked.match(/var\s+links\s*=\s*(\{[^;]+\})/);
        if (linksMatch) {
          try {
            const links = JSON.parse(linksMatch[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/:\s*'([^']+)'/g, ':"$1"'));
            m3u8 = links.hls4 || links.hls2 || links.hls3 || Object.values(links).find(v => typeof v === 'string' && v.includes('.m3u8'));
            if (m3u8 && m3u8.startsWith('/')) {
              const base = new URL(embedUrl);
              m3u8 = base.origin + m3u8;
            }
          } catch {}
        }
      }
    }
  }

  if (!m3u8) {
    const fileMatch = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
    if (fileMatch) m3u8 = fileMatch[1];
  }

  result = m3u8
    ? { ok: true, m3u8, m3u8_proxied: `/servpeli-stream?url=${encodeURIComponent(m3u8)}`, embedUrl }
    : { ok: false, error: 'No se encontró m3u8 en la página', embedUrl };

  embedM3u8Cache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

module.exports = { proxyServpeli, proxyServpeliStream, scrapUnlimplayM3u8, scrapUnlimplayM3u8Tv, extractM3u8FromEmbed, refreshUnlimplayCache, extractVoe, isVoe };

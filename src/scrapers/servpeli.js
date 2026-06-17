const axios = require('axios');
const cheerio = require('cheerio');

const TARGET = 'https://unlimplay.com';
const PROXY_PATH = '/servpeli';

const AD_SCRIPT_DOMAINS = [
  'googlesyndication.com',
  'doubleclick.net',
  'adnxs.com',
  'popads.net',
  'popcash.net',
  'trafficjunky.net',
  'propellerads.com',
  'juicyads.com',
  'hilltopads.net',
  'traffichunt.com',
  'plugrush.com',
  'trafficstars.com',
  'adsterra.com',
  'adtelligent.com',
  'adskeeper.com',
  'adspirit.de',
  'exoclick.com',
  'exosrv.com',
  'adform.net',
  'adsrvr.org',
  'adverticum.net',
  'revcontent.com',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  'bidvertiser.com',
  'zedo.com',
  'clickadu.com',
  'richpush.co',
  'push.express',
  'ilovefats.com',
  'vlitag.com',
  'nuggad.net',
  'geozo.com',
  'serv00.net',
  'cdn.bmcdn',
  'moonicorn',
  'adskeeper',
  'pushcrew',
  'onesignal.com',
  'pushnotif',
  'gravitymovie',
  'js.ad',
];

const AD_SCRIPT_PATTERNS = [
  /window\.(open|location)\s*=/,
  /popunder/i,
  /popup/i,
  /document\.write\s*\(/,
  /window\.popunder/i,
  /adblock/i,
  /anti.?adblock/i,
  /adsense/i,
  /googletag/i,
  /gtag\(/,
  /_atsv/,
  /push.*subscribe/i,
  /notification.*permission/i,
  /new\s+Worker\s*\(\s*['"]blob:/,
];

const AD_CLASSES = [
  'ad', 'ads', 'adsbygoogle', 'ad-container', 'ad-wrapper', 'advertisement',
  'banner-ad', 'popup', 'pop-up', 'popunder', 'overlay-ad', 'sticky-ad',
  'sponsor', 'sponsored', 'promo', 'interstitial', 'preroll',
];

function isAdDomain(src) {
  if (!src) return false;
  return AD_SCRIPT_DOMAINS.some(d => src.includes(d));
}

function isAdScript(content) {
  if (!content) return false;
  return AD_SCRIPT_PATTERNS.some(p => p.test(content));
}

function rewriteUrl(url, baseUrl) {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('#')) return url;
  if (url.startsWith('//')) url = 'https:' + url;
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

function rewriteCss(css, pageUrl) {
  return css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (match, url) => {
    const rewritten = rewriteUrl(url.trim(), pageUrl);
    return `url('${rewritten}')`;
  });
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
      const newSrc = rewriteUrl(src, pageUrl);
      $(el).attr('src', newSrc);
    }
  });

  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (isAdDomain(src)) {
      $(el).remove();
    } else if (src) {
      const newSrc = rewriteUrl(src, pageUrl);
      $(el).attr('src', newSrc);
    }
  });

  $('ins.adsbygoogle').remove();
  AD_CLASSES.forEach(cls => {
    $(`[id*="${cls}"], [class*="${cls}"]`).each((_, el) => {
      const tag = el.tagName;
      if (['div', 'section', 'aside', 'ins', 'span'].includes(tag)) {
        $(el).remove();
      }
    });
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

  $('source[src]').each((_, el) => {
    const src = $(el).attr('src');
    $(el).attr('src', rewriteUrl(src, pageUrl));
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
  var _open = window.open;
  window.open = function() { return null; };
  Object.defineProperty(document, 'onvisibilitychange', { set: function(){} });
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

async function proxyServpeli(req, res) {
  const subPath = req.params[0] || '';
  const queryString = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : '';
  const targetUrl = `${TARGET}/${subPath}${queryString}`;

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity',
      'Referer': TARGET + '/',
    };

    const response = await axios.get(targetUrl, {
      headers,
      responseType: 'arraybuffer',
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });

    const contentType = (response.headers['content-type'] || '').toLowerCase();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");

    const skipHeaders = [
      'content-encoding', 'transfer-encoding', 'connection', 'set-cookie',
      'x-frame-options', 'content-security-policy', 'speculation-rules',
      'cf-ray', 'cf-cache-status', 'cf-connecting-ip', 'alt-svc',
      'report-to', 'nel', 'server',
    ];
    Object.entries(response.headers).forEach(([k, v]) => {
      if (!skipHeaders.includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });

    if (contentType.includes('text/html')) {
      const html = response.data.toString('utf-8');
      const clean = cleanHtml(html, targetUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.removeHeader('content-length');
      return res.status(response.status).send(clean);
    }

    if (contentType.includes('text/css')) {
      const css = response.data.toString('utf-8');
      const rewritten = rewriteCss(css, targetUrl);
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.removeHeader('content-length');
      return res.status(response.status).send(rewritten);
    }

    if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
      let js = response.data.toString('utf-8');
      js = js.replace(/https?:\/\/unlimplay\.com/g, PROXY_PATH);
      res.setHeader('Content-Type', contentType);
      res.removeHeader('content-length');
      return res.status(response.status).send(js);
    }

    return res.status(response.status).send(response.data);

  } catch (err) {
    console.error(`[servpeli] Error proxying ${targetUrl}:`, err.message);
    res.status(502).json({
      error: 'Error al conectar con el servidor de películas',
      detalle: err.message,
      url: targetUrl
    });
  }
}

module.exports = { proxyServpeli };

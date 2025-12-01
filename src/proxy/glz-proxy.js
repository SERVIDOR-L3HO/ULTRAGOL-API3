/**
 * GLZ PROXY - Versión Modular y Mejorada
 * =====================================
 * 
 * Este proxy funciona igual que https://glzdeportes.com/glz.php?get=
 * 
 * CÓMO FUNCIONA:
 * 1. Recibe una URL de streaming vía ?get=
 * 2. Obtiene el contenido de esa URL
 * 3. Detecta el tipo de contenido (HTML, M3U8, Video)
 * 4. Limpia el contenido eliminando:
 *    - Scripts de anuncios (ads, popups, tracking)
 *    - Iframes maliciosos
 *    - Overlays y modales de publicidad
 *    - Protección anti-iframe (window.top checks)
 * 5. Preserva:
 *    - El reproductor de video (Clappr, JWPlayer, HLS.js)
 *    - Los controles del player
 *    - El contenido del stream
 * 6. Devuelve HTML limpio listo para mostrar
 */

const axios = require('axios');
const cheerio = require('cheerio');

// ============================================
// CONFIGURACIÓN DE DOMINIOS BLOQUEADOS
// ============================================
const BLOCKED_AD_DOMAINS = [
  // Google Ads
  'doubleclick.net', 'googlesyndication.com', 'adservice.google.com',
  'googleadservices.com', 'pagead2.googlesyndication.com',
  // Ad Networks
  'adnxs.com', 'adsrvr.org', 'amazon-adsystem.com', 'taboola.com',
  'outbrain.com', 'criteo.com', 'rubiconproject.com', 'pubmatic.com',
  'openx.net', 'casalemedia.com', 'advertising.com', 'bidswitch.net',
  // Popups y malware
  'popads.net', 'popcash.net', 'propellerads.com', 'exoclick.com',
  'trafficjunky.com', 'juicyads.com', 'clickadu.com', 'hilltopads.net',
  'adcash.com', 'mgid.com', 'revcontent.com', 'adsterra.com',
  // Específicos de streaming
  'falcobipod.com', 'loijtoottuleringv', 'nunush', 'lalavita',
  'awistats.com', 'histats.com', 'amung.us', 'statcounter.com',
  // Crypto/Mining
  'cointraffic.io', 'a-ads.com', 'coinhive.com',
  // Social tracking
  'facebook.com/tr', 'connect.facebook.net/signals'
];

// Scripts de ads conocidos (por contenido)
const AD_SCRIPT_PATTERNS = [
  'aclib', 'runPop', 'popunder', 'popUp', 'adblock',
  'zoneId', 'zoneid', 'bannerid', 'admedia',
  'Histats', 'histats', 'amung.us', 'statcounter',
  'eval(', 'atob(', 'document.write('
];

// Scripts del reproductor que debemos PRESERVAR
const PLAYER_SCRIPT_PATTERNS = [
  'clappr', 'jwplayer', 'hls.js', 'hls.min.js',
  'p2p-engine', 'video.js', 'videojs', 'plyr',
  'WSreload', 'wsReload', 'player', 'Player',
  'source', 'Source', 'stream', 'Stream'
];

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Verifica si un dominio está bloqueado
 */
function isBlockedDomain(url) {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return BLOCKED_AD_DOMAINS.some(domain => urlLower.includes(domain));
}

/**
 * Verifica si una URL es válida
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Obtiene el dominio base de una URL
 */
function getBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

/**
 * Verifica si un script es del reproductor (debe preservarse)
 */
function isPlayerScript(content) {
  const contentLower = content.toLowerCase();
  return PLAYER_SCRIPT_PATTERNS.some(pattern => 
    contentLower.includes(pattern.toLowerCase())
  );
}

/**
 * Verifica si un script es de publicidad (debe eliminarse)
 */
function isAdScript(content, src = '') {
  const combined = (content + src).toLowerCase();
  return AD_SCRIPT_PATTERNS.some(pattern => 
    combined.includes(pattern.toLowerCase())
  ) || isBlockedDomain(src);
}

// ============================================
// FILTRADO DE M3U8/HLS
// ============================================

/**
 * Filtra contenido M3U8 eliminando segmentos de anuncios
 * y reescribiendo URLs relativas para pasar por el proxy
 */
function filterM3u8Content(content, baseUrl, proxyBaseUrl) {
  const lines = content.split('\n');
  const filtered = [];
  let skipNext = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detectar líneas de anuncios
    if (trimmed.toLowerCase().includes('ad-') || 
        trimmed.toLowerCase().includes('/ads/') ||
        trimmed.toLowerCase().includes('advertisement') ||
        trimmed.toLowerCase().includes('preroll') ||
        trimmed.toLowerCase().includes('midroll') ||
        isBlockedDomain(trimmed)) {
      skipNext = true; // Saltar también la siguiente línea (el segmento)
      continue;
    }

    // Si la línea anterior era ad, saltar este segmento
    if (skipNext && !trimmed.startsWith('#')) {
      skipNext = false;
      continue;
    }

    // Reescribir URLs para pasar por el proxy
    if (!trimmed.startsWith('#') && trimmed.length > 0) {
      let fullUrl = trimmed;
      if (!trimmed.startsWith('http')) {
        if (trimmed.startsWith('/')) {
          fullUrl = getBaseUrl(baseUrl) + trimmed;
        } else {
          const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
          fullUrl = base + trimmed;
        }
      }
      // Pasar por el proxy para mantener CORS y headers
      filtered.push(`${proxyBaseUrl}/glz?get=${encodeURIComponent(fullUrl)}`);
    } else {
      filtered.push(line);
    }
  }

  return filtered.join('\n');
}

// ============================================
// LIMPIEZA DE HTML
// ============================================

/**
 * Limpia el HTML eliminando scripts, iframes y elementos de ads
 */
function cleanHtml($, targetUrl) {
  const originalOrigin = getBaseUrl(targetUrl);

  // 1. ELIMINAR SCRIPTS DE ADS
  $('script').each((i, elem) => {
    const src = $(elem).attr('src') || '';
    const content = $(elem).html() || '';
    
    // Si es script de ads, eliminar
    if (isAdScript(content, src)) {
      $(elem).remove();
      return;
    }
    
    // Si es script del player, limpiar pero preservar
    if (isPlayerScript(content)) {
      let cleanContent = content;
      // Remover protección anti-iframe
      cleanContent = cleanContent.replace(/if\s*\(\s*window\s*[!=]==?\s*window\.top\s*\)[^}]*\{[^}]*\}/gi, '');
      cleanContent = cleanContent.replace(/window\.top/gi, 'window.self');
      cleanContent = cleanContent.replace(/document\.location\s*=\s*["'][^"']*["']/gi, '');
      $(elem).html(cleanContent);
    }
  });

  // 2. ELIMINAR NOSCRIPT (usualmente contiene ads fallback)
  $('noscript').remove();

  // 3. LIMPIAR LINKS MALICIOSOS
  $('a').each((i, elem) => {
    const href = $(elem).attr('href') || '';
    if (isBlockedDomain(href) || href.includes('javascript:') || href.includes('void(')) {
      $(elem).removeAttr('href');
      $(elem).removeAttr('onclick');
      $(elem).removeAttr('target');
      $(elem).css('pointer-events', 'none');
    }
  });

  // 4. ELIMINAR IFRAMES DE ADS, ENCONTRAR IFRAME PRINCIPAL
  let mainIframeSrc = null;
  $('iframe').each((i, elem) => {
    const iframeSrc = $(elem).attr('src') || '';
    const srcLower = iframeSrc.toLowerCase();
    
    if (isBlockedDomain(iframeSrc) ||
        srcLower.includes('ads') ||
        srcLower.includes('pop') ||
        srcLower.includes('banner') ||
        srcLower.includes('track')) {
      $(elem).remove();
    } else if (iframeSrc && !mainIframeSrc) {
      // Guardar el primer iframe válido (probablemente el player)
      mainIframeSrc = iframeSrc.startsWith('http') ? iframeSrc : 
                      iframeSrc.startsWith('//') ? `https:${iframeSrc}` :
                      new URL(iframeSrc, targetUrl).href;
    }
  });

  // 5. ELIMINAR DIVS DE ADS
  $('div, span, section, aside').each((i, elem) => {
    const elemId = $(elem).attr('id') || '';
    const elemClass = $(elem).attr('class') || '';
    const combined = (elemId + ' ' + elemClass).toLowerCase();
    
    // No eliminar el player
    if (combined.includes('player') || combined.includes('video')) {
      return;
    }
    
    if (combined.includes('ad-') || combined.includes('ads-') ||
        combined.includes('advert') || combined.includes('banner') ||
        combined.includes('popup') || combined.includes('overlay') ||
        combined.includes('modal') || combined.includes('sponsor')) {
      $(elem).remove();
    }
  });

  // 6. ELIMINAR EVENT HANDLERS MALICIOSOS
  $('[onclick], [onload], [onerror], [onmouseover]').each((i, elem) => {
    const onclick = $(elem).attr('onclick') || '';
    // Preservar controles del player
    if (!onclick.includes('unmute') && !onclick.includes('play') && !onclick.includes('pause')) {
      $(elem).removeAttr('onclick');
    }
    $(elem).removeAttr('onload');
    $(elem).removeAttr('onerror');
    $(elem).removeAttr('onmouseover');
  });

  // 7. ELIMINAR ELEMENTOS DE TRACKING
  $('img[src*="pixel"], img[src*="beacon"], img[src*="tracking"]').remove();
  $('img[width="1"], img[height="1"]').remove();
  $('object').remove();

  return mainIframeSrc;
}

/**
 * Asegura que existan los elementos del player
 */
function ensurePlayerElements($) {
  // Agregar contenedor del player si no existe
  if ($('#player').length === 0) {
    $('body').prepend('<div class="jwplayer jw-reset jw-skin-glow player live" id="player"></div>');
  }
  
  // Agregar botón de unmute si no existe
  if ($('#btn-unmute').length === 0) {
    $('body').append(`
      <div id="btn-unmute" onclick="WSUnmute()" style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ff0101, #cc0000);
        color: #fff;
        padding: 15px 30px;
        border-radius: 8px;
        cursor: pointer;
        z-index: 9999;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(255,0,0,0.4);
        font-family: system-ui, -apple-system, sans-serif;
      ">🔊 CLICK TO UNMUTE</div>
    `);
  }
  
  // Agregar video-js fallback si no existe
  if ($('video-js').length === 0 && $('#player2').length === 0) {
    $('#player').after('<video-js id="player2" class="vjs-big-play-centered vjs-default-skin player" style="display:none" controls></video-js>');
  }
}

/**
 * Agrega estilos CSS para ocultar ads
 */
function addAdBlockStyles($) {
  $('head').append(`
    <style>
      /* GLZ Ad Block Styles */
      a[href*="javascript"], a[onclick]:not([onclick*="unmute"]):not([onclick*="play"]) { 
        pointer-events: none !important; 
        cursor: default !important; 
      }
      div[class*="ad"], div[id*="ad"]:not(#player), 
      div[class*="popup"], div[class*="overlay"]:not(.player):not(.jwplayer):not(.video-js),
      div[class*="banner"], div[class*="sponsor"] { 
        display: none !important; 
      }
      object, iframe[src*="ad"], iframe[src*="pop"] { 
        display: none !important; 
      }
      /* Hacer el player fullscreen */
      #player, .player, .jwplayer, video-js, video {
        width: 100% !important;
        max-width: 100vw !important;
        height: auto !important;
        min-height: 50vh !important;
      }
    </style>
  `);
}

// ============================================
// FUNCIÓN PRINCIPAL DEL PROXY
// ============================================

/**
 * Procesa una URL y devuelve contenido limpio
 * @param {string} targetUrl - URL a procesar
 * @param {string} proxyBaseUrl - URL base del proxy (para reescribir enlaces)
 * @returns {Object} - { type: 'html'|'m3u8'|'video', content: string|Buffer, headers: Object }
 */
async function processUrl(targetUrl, proxyBaseUrl) {
  // Validar URL
  if (!isValidUrl(targetUrl)) {
    throw new Error('URL inválida');
  }

  if (isBlockedDomain(targetUrl)) {
    throw new Error('Dominio bloqueado por política de anuncios');
  }

  const parsedUrl = new URL(targetUrl);
  const originalOrigin = `${parsedUrl.protocol}//${parsedUrl.host}`;

  // Obtener contenido
  const response = await axios.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': originalOrigin + '/',
      'Origin': originalOrigin,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin'
    },
    timeout: 15000,
    maxRedirects: 5,
    responseType: 'arraybuffer',
    validateStatus: () => true
  });

  const contentType = response.headers['content-type'] || '';
  const responseData = Buffer.from(response.data);

  // CASO 1: M3U8/HLS Playlist
  if (contentType.includes('mpegurl') || contentType.includes('m3u8') || targetUrl.includes('.m3u8')) {
    const textContent = responseData.toString('utf-8');
    const filteredContent = filterM3u8Content(textContent, targetUrl, proxyBaseUrl);
    return {
      type: 'm3u8',
      content: filteredContent,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

  // CASO 2: Video/Segmentos TS
  if (contentType.includes('video/') || contentType.includes('application/octet-stream') || 
      targetUrl.includes('.ts') || targetUrl.includes('.mp4') || targetUrl.includes('.m4s')) {
    return {
      type: 'video',
      content: responseData,
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

  // CASO 3: HTML - Limpiar y devolver
  const htmlContent = responseData.toString('utf-8');
  const $ = cheerio.load(htmlContent);

  // Limpiar HTML
  const mainIframeSrc = cleanHtml($, targetUrl);
  
  // Si hay un iframe principal, procesarlo también
  if (mainIframeSrc) {
    try {
      const iframeResult = await processIframe(mainIframeSrc, originalOrigin, proxyBaseUrl);
      return iframeResult;
    } catch (iframeError) {
      console.log(`Error procesando iframe: ${iframeError.message}`);
      // Continuar con el HTML original
    }
  }

  // Asegurar elementos del player
  ensurePlayerElements($);
  
  // Agregar estilos de bloqueo
  addAdBlockStyles($);
  
  // Agregar base tag para recursos relativos
  const baseTag = `<base href="${originalOrigin}/">`;
  const headContent = $('head').html() || '';
  $('head').html(baseTag + headContent);

  return {
    type: 'html',
    content: $.html(),
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-Frame-Options': 'ALLOWALL',
      'X-Content-Type-Options': 'nosniff'
    }
  };
}

/**
 * Procesa un iframe embebido
 */
async function processIframe(iframeSrc, originalOrigin, proxyBaseUrl) {
  const iframeParsed = new URL(iframeSrc);
  const iframeOrigin = `${iframeParsed.protocol}//${iframeParsed.host}`;

  const iframeResponse = await axios.get(iframeSrc, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': originalOrigin + '/',
      'Origin': originalOrigin,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site'
    },
    timeout: 15000,
    maxRedirects: 5,
    responseType: 'text'
  });

  let iframeHtml = iframeResponse.data;
  
  // Remover protección anti-iframe
  iframeHtml = iframeHtml.replace(/if\s*\(\s*window\s*==\s*window\.top\s*\)[^;]*;?/gi, '');
  iframeHtml = iframeHtml.replace(/document\.location\s*=\s*["'][^"']*["']/gi, '');

  const $ = cheerio.load(iframeHtml);
  
  // Limpiar el HTML del iframe
  cleanHtml($, iframeSrc);
  
  // Asegurar elementos del player
  ensurePlayerElements($);
  
  // Agregar estilos
  addAdBlockStyles($);
  
  // Agregar base tag
  const baseTag = `<base href="${iframeOrigin}/">`;
  const headContent = $('head').html() || '';
  $('head').html(baseTag + headContent);

  return {
    type: 'html',
    content: $.html(),
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-Frame-Options': 'ALLOWALL'
    }
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  processUrl,
  filterM3u8Content,
  cleanHtml,
  isBlockedDomain,
  isValidUrl,
  BLOCKED_AD_DOMAINS,
  AD_SCRIPT_PATTERNS,
  PLAYER_SCRIPT_PATTERNS
};

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animejara.com';
const AJAX_URL = `${BASE_URL}/wp-admin/admin-ajax.php`;
const CACHE_TTL = 10 * 60 * 1000;
const DETAIL_CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Referer': `${BASE_URL}/`
};

function cached(key, ttl) {
  const item = cache.get(key);
  return item && Date.now() - item.timestamp < ttl ? item.data : null;
}

function saveCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

function absoluteUrl(url, base = BASE_URL) {
  if (!url) return null;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function serverName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'servidor';
  }
}

async function buscarAnime(query) {
  const normalized = String(query || '').trim();
  if (!normalized) throw new Error('El parámetro de búsqueda no puede estar vacío');

  const key = `search:${normalized.toLowerCase()}`;
  const hit = cached(key, CACHE_TTL);
  if (hit) return hit;

  const response = await axios.post(
    AJAX_URL,
    new URLSearchParams({ action: 'live_search', s: normalized }).toString(),
    { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );

  const animes = response.data?.success ? response.data.data?.animes || [] : [];
  return saveCache(key, {
    query: normalized,
    total: animes.length,
    resultados: animes.map((anime) => ({
      titulo: anime.titulo || null,
      slug: anime.slug || null,
      poster: absoluteUrl(anime.poster),
      rating: anime.rating ? Number(anime.rating) : null,
      anio: anime.anio ? Number(anime.anio) : null,
      vistas: anime.vistas ? Number(anime.vistas) : 0,
      tipo: anime.tipo || 'serie'
    }))
  });
}

function parseSeasons(html) {
  const match = html.match(/const\s+TEMPORADAS_DATA\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]).map((season) => ({
      numero: Number(season.numero_temporada),
      poster: absoluteUrl(season.poster_temporada),
      episodios: (season.episodios || []).map((episode) => ({
        numero: Number(episode.numero_episodio),
        titulo: episode.nombre_episodio || null,
        poster: absoluteUrl(episode.poster_episodio),
        idiomas: episode.idiomas || [],
        actualizado: episode.fecha_actualizacion || null
      }))
    }));
  } catch {
    return [];
  }
}

async function obtenerAnime(slug) {
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9-]+$/i.test(cleanSlug)) throw new Error('Slug de anime inválido');

  const key = `detail:${cleanSlug.toLowerCase()}`;
  const hit = cached(key, DETAIL_CACHE_TTL);
  if (hit) return hit;

  const url = `${BASE_URL}/anime/${encodeURIComponent(cleanSlug)}`;
  const response = await axios.get(url, { headers: HEADERS, timeout: 20000 });
  const html = response.data;
  const $ = cheerio.load(html);
  const title = $('h1.anime-title-desktop').first().text().trim()
    || $('h1.anime-title-mobile').first().text().trim()
    || $('meta[property="og:title"]').attr('content')?.replace(/\s+-\s+AnimeJara.*$/i, '').trim()
    || cleanSlug;
  const poster = absoluteUrl($('#mainPosterImg').attr('src') || $('meta[property="og:image"]').attr('content'));
  const wpId = $('#rating-container').attr('data-wp-id') || null;
  const temporadas = parseSeasons(html);

  if (!temporadas.length && !html.includes('AnimeJara')) {
    throw new Error('Anime no encontrado en AnimeJara');
  }

  return saveCache(key, {
    titulo: title,
    slug: cleanSlug,
    url,
    poster,
    animejara_id: wpId ? Number(wpId) : null,
    temporadas,
    total_temporadas: temporadas.length,
    total_episodios: temporadas.reduce((sum, season) => sum + season.episodios.length, 0),
    fuente: BASE_URL
  });
}

function parseEpisodeLinks(html) {
  const match = html.match(/const\s+enlaces\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    const links = JSON.parse(match[1]);
    return [...new Set(links.filter((link) => typeof link === 'string' && /^https?:\/\//i.test(link)))]
      .map((link) => ({
        nombre: serverName(link),
        url: link,
        tipo: 'embed'
      }));
  } catch {
    return [];
  }
}

function parseInnerServerLinks(html) {
  const $ = cheerio.load(html);
  const servers = [];

  $('#logo-list li').each((_, element) => {
    const item = $(element);
    const onclick = item.attr('onclick') || '';
    const match = onclick.match(/playVideo\(\s*["']([^"']+)["']\s*\)/i);
    const url = match?.[1] || item.attr('data-url') || item.find('a').attr('href');
    if (!url || !/^https?:\/\//i.test(url)) return;

    const nombre = item.find('.nombre-server').first().text().trim()
      || item.find('img').attr('alt')
      || serverName(url);
    servers.push({ nombre: nombre.toLowerCase(), url, tipo: 'servidor' });
  });

  // Fallback para cambios menores de HTML donde solo quede playVideo(...)
  if (!servers.length) {
    const matches = [...html.matchAll(/playVideo\(\s*["']([^"']+)["']\s*\)/gi)];
    for (const match of matches) {
      if (/^https?:\/\//i.test(match[1])) {
        servers.push({ nombre: serverName(match[1]), url: match[1], tipo: 'servidor' });
      }
    }
  }

  const unique = new Map();
  for (const server of servers) unique.set(server.url, server);
  return [...unique.values()];
}

async function resolveEmbed(embedUrl) {
  try {
    const response = await axios.get(embedUrl, {
      headers: { ...HEADERS, Referer: `${BASE_URL}/` },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });
    return parseInnerServerLinks(response.data);
  } catch (error) {
    return [];
  }
}

async function obtenerEpisodio(slug, temporada, episodio) {
  const season = Number(temporada);
  const episode = Number(episodio);
  if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) {
    throw new Error('Temporada y episodio deben ser números enteros positivos');
  }

  const anime = await obtenerAnime(slug);
  const seasonData = anime.temporadas.find((item) => item.numero === season);
  const episodeData = seasonData?.episodios.find((item) => item.numero === episode);
  if (!episodeData) throw new Error(`No existe el episodio ${season}x${episode} para ${anime.titulo}`);

  const url = `${BASE_URL}/episode/${encodeURIComponent(anime.slug)}-${season}x${episode}/`;
  // AnimeJara puede responder 404 para episodios existentes, pero entregar
  // igualmente el HTML completo del reproductor. Por eso validamos el
  // contenido y no descartamos automáticamente ese status.
  const response = await axios.get(url, {
    headers: HEADERS,
    timeout: 20000,
    validateStatus: (status) => status < 500
  });
  const embeds = parseEpisodeLinks(response.data);
  if (!embeds.length) {
    throw new Error(`No se encontraron servidores en el episodio ${season}x${episode}`);
  }
  const resolved = await Promise.all(embeds.map((embed) => resolveEmbed(embed.url)));
  const serversByUrl = new Map();
  for (const servers of resolved) {
    for (const server of servers) serversByUrl.set(server.url, server);
  }
  const servidores = [...serversByUrl.values()];

  return {
    anime: { titulo: anime.titulo, slug: anime.slug, poster: anime.poster },
    temporada: season,
    episodio: episode,
    titulo_episodio: episodeData.titulo,
    idiomas: episodeData.idiomas,
    url_animejara: url,
    servidores,
    total_servidores: servidores.length,
    total_embeds_procesados: embeds.length,
    fuente: BASE_URL
  };
}

function clearAnimeCache() {
  cache.clear();
}

module.exports = { buscarAnime, obtenerAnime, obtenerEpisodio, clearAnimeCache };
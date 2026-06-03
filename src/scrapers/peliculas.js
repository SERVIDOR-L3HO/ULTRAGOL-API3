const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://verhdlink.cam';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();
const tmdbCache = new Map();

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Referer': 'https://verhdlink.cam/',
};

function getServerName(link) {
  if (!link) return 'unknown';
  if (link.includes('dr0pstream') || link.includes('dropload')) return 'dropload';
  if (link.includes('supervideo')) return 'supervideo';
  if (link.includes('mixdrop')) return 'mixdrop';
  if (link.includes('dood')) return 'doodstream';
  if (link.includes('verhdlink') && link.includes('fullhd')) return 'server4k';
  if (link.includes('streamtape')) return 'streamtape';
  if (link.includes('upstream')) return 'upstream';
  if (link.includes('voe')) return 'voe';
  if (link.includes('filemoon')) return 'filemoon';
  return link.split('/')[2]?.replace('www.', '') || 'servidor';
}

async function scrapPelicula(imdbId) {
  const cacheKey = `pelicula_${imdbId}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
    return cached.data;
  }

  const url = `${BASE_URL}/movie/${imdbId}`;
  const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(response.data);

  const idiomas = {};

  $('._player-mirrors-type li').each((_, el) => {
    const tipo = $(el).attr('data-type');
    if (tipo) idiomas[tipo] = [];
  });

  if (Object.keys(idiomas).length === 0) {
    idiomas['latino'] = [];
  }

  $('ul._player-mirrors').each((_, ulEl) => {
    const ul = $(ulEl);
    const classes = ul.attr('class') || '';

    let tipo = null;
    for (const key of Object.keys(idiomas)) {
      if (classes.includes(key)) {
        tipo = key;
        break;
      }
    }
    if (!tipo) {
      const match = classes.match(/_(player-mirrors)\s+(\w+)/);
      if (match) tipo = match[2];
      else tipo = 'latino';
    }

    if (!idiomas[tipo]) idiomas[tipo] = [];

    ul.find('li[data-link]').each((_, li) => {
      const link = $(li).attr('data-link');
      if (!link || link.trim() === '') return;

      let fullLink = link;
      if (link.startsWith('//')) fullLink = 'https:' + link;

      idiomas[tipo].push({
        nombre: getServerName(link),
        link: fullLink,
        activo: $(li).hasClass('active')
      });
    });

    ul.find('.fullhd[data-link]').each((_, li) => {
      const link = $(li).attr('data-link');
      if (!link || link.trim() === '') return;
      idiomas[tipo].push({
        nombre: 'server4k',
        link: link,
        activo: false
      });
    });
  });

  const poster = `${BASE_URL}/posters_new/${imdbId}.jpg`;

  const result = {
    imdb_id: imdbId,
    poster,
    idiomas,
    fuente: 'verhdlink.cam',
    actualizado: new Date().toISOString()
  };

  cache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

async function tmdbToImdb(tmdbId) {
  const cacheKey = `tmdb_${tmdbId}`;
  const cached = tmdbCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < 24 * 60 * 60 * 1000) return cached.data;

  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new Error('TMDB_ACCESS_TOKEN no configurado');

  const [externalIds, movieInfo] = await Promise.all([
    axios.get(`${TMDB_BASE}/movie/${tmdbId}/external_ids`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000
    }),
    axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { language: 'es-MX' },
      timeout: 8000
    })
  ]);

  const imdbId = externalIds.data.imdb_id;
  if (!imdbId) throw new Error(`No se encontró IMDB ID para TMDB ${tmdbId}`);

  const info = movieInfo.data;
  const result = {
    tmdb_id: tmdbId,
    imdb_id: imdbId,
    titulo: info.title,
    titulo_original: info.original_title,
    sinopsis: info.overview,
    anio: info.release_date?.slice(0, 4),
    nota: info.vote_average?.toFixed(1),
    duracion: info.runtime,
    generos: (info.genres || []).map(g => g.name),
    tmdb_poster: info.poster_path ? `https://image.tmdb.org/t/p/w500${info.poster_path}` : null,
    tmdb_backdrop: info.backdrop_path ? `https://image.tmdb.org/t/p/w1280${info.backdrop_path}` : null
  };

  tmdbCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

async function scrapPeliculaPorTmdb(tmdbId) {
  const meta = await tmdbToImdb(tmdbId);
  const player = await scrapPelicula(meta.imdb_id);
  return { ...player, ...meta };
}

function clearPeliculaCache(imdbId) {
  if (imdbId) {
    cache.delete(`pelicula_${imdbId}`);
  } else {
    cache.clear();
    tmdbCache.clear();
  }
}

module.exports = { scrapPelicula, scrapPeliculaPorTmdb, tmdbToImdb, clearPeliculaCache };

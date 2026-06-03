const axios = require('axios');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0';
const CACHE_TTL = 60 * 60 * 1000;
const serieCache = new Map();
const episodeCache = new Map();

function tmdbHeaders() {
  return { Authorization: `Bearer ${TMDB_TOKEN}` };
}

async function getSeriePorTmdb(tmdbId) {
  const key = `serie_${tmdbId}`;
  const cached = serieCache.get(key);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.data;

  const headers = tmdbHeaders();

  const [infoRes, extRes] = await Promise.all([
    axios.get(`${TMDB_BASE}/tv/${tmdbId}`, {
      headers,
      params: { language: 'es-MX' },
      timeout: 10000
    }),
    axios.get(`${TMDB_BASE}/tv/${tmdbId}/external_ids`, {
      headers,
      timeout: 10000
    })
  ]);

  const info = infoRes.data;
  const ext = extRes.data;

  const temporadas = (info.seasons || [])
    .filter(s => s.season_number > 0)
    .map(s => ({
      numero: s.season_number,
      nombre: s.name,
      episodios: s.episode_count,
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null,
      fecha: s.air_date?.slice(0, 4) || null
    }));

  const result = {
    tmdb_id: tmdbId,
    imdb_id: ext.imdb_id || null,
    titulo: info.name,
    titulo_original: info.original_name,
    sinopsis: info.overview,
    anio: info.first_air_date?.slice(0, 4),
    nota: info.vote_average?.toFixed(1),
    generos: (info.genres || []).map(g => g.name),
    temporadas,
    total_temporadas: info.number_of_seasons,
    total_episodios: info.number_of_episodes,
    estado: info.status,
    tmdb_poster: info.poster_path ? `https://image.tmdb.org/t/p/w500${info.poster_path}` : null,
    tmdb_backdrop: info.backdrop_path ? `https://image.tmdb.org/t/p/w1280${info.backdrop_path}` : null
  };

  serieCache.set(key, { data: result, ts: Date.now() });
  return result;
}

async function getEpisodiosPorTemporada(tmdbId, season) {
  const key = `eps_${tmdbId}_s${season}`;
  const cached = episodeCache.get(key);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.data;

  const headers = tmdbHeaders();
  const res = await axios.get(`${TMDB_BASE}/tv/${tmdbId}/season/${season}`, {
    headers,
    params: { language: 'es-MX' },
    timeout: 10000
  });

  const eps = (res.data.episodes || []).map(e => ({
    numero: e.episode_number,
    titulo: e.name,
    sinopsis: e.overview,
    fecha: e.air_date,
    duracion: e.runtime,
    nota: e.vote_average?.toFixed(1),
    imagen: e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : null
  }));

  episodeCache.set(key, { data: eps, ts: Date.now() });
  return eps;
}

function getServidoresSerie(imdbId, season, episode) {
  if (!imdbId) return [];
  return [
    {
      nombre: 'vidsrc',
      link: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`
    },
    {
      nombre: 'vidsrc2',
      link: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`
    }
  ];
}

function clearSerieCache(tmdbId) {
  if (tmdbId) {
    for (const key of serieCache.keys()) {
      if (key.includes(`_${tmdbId}`)) serieCache.delete(key);
    }
    for (const key of episodeCache.keys()) {
      if (key.includes(`_${tmdbId}_`)) episodeCache.delete(key);
    }
  } else {
    serieCache.clear();
    episodeCache.clear();
  }
}

const searchCache = new Map();

async function buscarSerie(query, pagina = 1) {
  const cacheKey = `search_${query}_${pagina}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < 10 * 60 * 1000) return cached.data;

  const headers = tmdbHeaders();
  const res = await axios.get(`${TMDB_BASE}/search/tv`, {
    headers,
    params: { query, language: 'es-MX', page: pagina, include_adult: false },
    timeout: 8000
  });

  const result = {
    pagina: res.data.page,
    total_resultados: res.data.total_results,
    total_paginas: res.data.total_pages,
    resultados: (res.data.results || []).map(s => ({
      tmdb_id: s.id,
      titulo: s.name,
      titulo_original: s.original_name,
      sinopsis: s.overview,
      anio: s.first_air_date?.slice(0, 4) || null,
      nota: s.vote_average?.toFixed(1),
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null,
      popularidad: s.popularity
    }))
  };

  searchCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

module.exports = { getSeriePorTmdb, getEpisodiosPorTemporada, getServidoresSerie, clearSerieCache, buscarSerie };

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");
const ytdl = require("@distube/ytdl-core");
const playDl = require("play-dl");
const { execFile, spawn } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);
const cache = require("./src/cache/dataCache");
const { scrapTabla } = require("./src/scrapers/tabla");
const { scrapNoticias } = require("./src/scrapers/noticias");
const { scrapGoleadores } = require("./src/scrapers/goleadores");
const { scrapEquipos } = require("./src/scrapers/equipos");
const { scrapLogos } = require("./src/scrapers/logos");
const { scrapVideos } = require("./src/scrapers/videos");
const { scrapCalendario } = require("./src/scrapers/calendario");

const { scrapTablaPremier } = require("./src/scrapers/premier/tabla");
const { scrapNoticiasPremier } = require("./src/scrapers/premier/noticias");
const { scrapGoleadoresPremier } = require("./src/scrapers/premier/goleadores");
const { scrapCalendarioPremier } = require("./src/scrapers/premier/calendario");
const { scrapMejoresMomentosPremier } = require("./src/scrapers/premier/mejoresMomentos");

const { scrapTablaLaLiga } = require("./src/scrapers/laliga/tabla");
const { scrapNoticiasLaLiga } = require("./src/scrapers/laliga/noticias");
const { scrapGoleadoresLaLiga } = require("./src/scrapers/laliga/goleadores");
const { scrapCalendarioLaLiga } = require("./src/scrapers/laliga/calendario");
const { scrapMejoresMomentosLaLiga } = require("./src/scrapers/laliga/mejoresMomentos");

const { scrapTablaSerieA } = require("./src/scrapers/seriea/tabla");
const { scrapNoticiasSerieA } = require("./src/scrapers/seriea/noticias");
const { scrapGoleadoresSerieA } = require("./src/scrapers/seriea/goleadores");
const { scrapCalendarioSerieA } = require("./src/scrapers/seriea/calendario");
const { scrapMejoresMomentosSerieA } = require("./src/scrapers/seriea/mejoresMomentos");

const { scrapTablaBundesliga } = require("./src/scrapers/bundesliga/tabla");
const { scrapNoticiasBundesliga } = require("./src/scrapers/bundesliga/noticias");
const { scrapGoleadoresBundesliga } = require("./src/scrapers/bundesliga/goleadores");
const { scrapCalendarioBundesliga } = require("./src/scrapers/bundesliga/calendario");
const { scrapMejoresMomentosBundesliga } = require("./src/scrapers/bundesliga/mejoresMomentos");

const { scrapTablaLigue1 } = require("./src/scrapers/ligue1/tabla");
const { scrapNoticiasLigue1 } = require("./src/scrapers/ligue1/noticias");
const { scrapGoleadoresLigue1 } = require("./src/scrapers/ligue1/goleadores");
const { scrapCalendarioLigue1 } = require("./src/scrapers/ligue1/calendario");
const { scrapMejoresMomentosLigue1 } = require("./src/scrapers/ligue1/mejoresMomentos");

const { scrapPelicula, scrapPeliculaPorTmdb, tmdbToImdb, clearPeliculaCache, buscarPelicula } = require("./src/scrapers/peliculas");
const { getSeriePorTmdb, getEpisodiosPorTemporada, clearSerieCache, buscarSerie } = require("./src/scrapers/series");
const { scrapTransmisiones } = require("./src/scrapers/transmisiones");
const { scrapTransmisiones2 } = require("./src/scrapers/transmisiones2");
const { scrapTransmisiones3 } = require("./src/scrapers/transmisiones3");
const { scrapTransmisiones4 } = require("./src/scrapers/transmisiones4");
const { scrapTransmisiones5 } = require("./src/scrapers/transmisiones5");
const { scrapTransmisiones6 } = require("./src/scrapers/transmisiones6");
const { 
  scrapCanales, 
  scrapCanalesPorPais, 
  scrapCanalesPorCategoria, 
  scrapCanalesDeportes,
  scrapCanalesPremium
} = require("./src/scrapers/canales");

const { scrapCanales2 } = require("./src/scrapers/canales2");

const { 
  scrapMarcadoresLigaMX,
  scrapMarcadoresPremier,
  scrapMarcadoresLaLiga,
  scrapMarcadoresSerieA,
  scrapMarcadoresBundesliga,
  scrapMarcadoresLigue1
} = require("./src/scrapers/marcadores");

const { 
  generarNotificaciones, 
  obtenerEstadisticasNotificaciones 
} = require("./src/scrapers/notificaciones");

const {
  scrapAlineacionesLigaMX,
  scrapAlineacionesPremier,
  scrapAlineacionesLaLiga,
  scrapAlineacionesSerieA,
  scrapAlineacionesBundesliga,
  scrapAlineacionesLigue1,
  scrapAlineacionesTodasLasLigas,
  scrapAlineacionPartido,
  getPhotoStats,
  clearPhotoCache
} = require("./src/scrapers/alineaciones");

const {
  scrapDataFactoryLiga,
  scrapTodasLasLigasDataFactory,
  DATAFACTORY_URLS,
  ESPN_LEAGUE_IDS,
  CATEGORIAS_LIGAS
} = require("./src/scrapers/datafactory");

const {
  scrapEstadisticasLigaMX,
  scrapEstadisticasPremier,
  scrapEstadisticasLaLiga,
  scrapEstadisticasSerieA,
  scrapEstadisticasBundesliga,
  scrapEstadisticasLigue1,
  scrapEstadisticasTodasLasLigas,
  scrapEstadisticasPartido
} = require("./src/scrapers/estadisticas");

const path = require("path");
const { securityHeaders, apiLimiter } = require("./src/middleware/auth");
const { proxyServpeli, proxyServpeliStream, scrapUnlimplayM3u8, scrapUnlimplayM3u8Tv, extractM3u8FromEmbed, refreshUnlimplayCache } = require("./src/scrapers/servpeli");
const app = express();

app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

async function updateAllData() {
  console.log("🔄 Actualizando datos de Liga MX...");
  
  try {
    const [tabla, noticias, goleadores, equipos, logos, videos, calendario] = await Promise.all([
      scrapTabla().catch(err => { console.error("Error en tabla:", err.message); return null; }),
      scrapNoticias().catch(err => { console.error("Error en noticias:", err.message); return null; }),
      scrapGoleadores().catch(err => { console.error("Error en goleadores:", err.message); return null; }),
      scrapEquipos().catch(err => { console.error("Error en equipos:", err.message); return null; }),
      scrapLogos().catch(err => { console.error("Error en logos:", err.message); return null; }),
      scrapVideos().catch(err => { console.error("Error en videos:", err.message); return null; }),
      scrapCalendario().catch(err => { console.error("Error en calendario:", err.message); return null; })
    ]);
    
    if (tabla) cache.set("tabla", tabla);
    if (noticias) cache.set("noticias", noticias);
    if (goleadores) cache.set("goleadores", goleadores);
    if (equipos) cache.set("equipos", equipos);
    if (logos) cache.set("logos", logos);
    if (videos) cache.set("videos", videos);
    if (calendario) cache.set("calendario", calendario);
    
    console.log("✅ Datos actualizados exitosamente");
  } catch (error) {
    console.error("❌ Error actualizando datos:", error.message);
  }
}

async function updateMarcadores() {
  console.log("⚽ Actualizando marcadores de todas las ligas para notificaciones...");
  
  try {
    // Guardar estados anteriores para detectar eventos (goles, inicio de partido, etc.)
    const marcadoresAnterior = cache.get("marcadores");
    const marcadoresAnteriorporemier = cache.get("marcadorespremier");
    const marcadoresAnteriorlaliga = cache.get("marcadoreslaliga");
    const marcadoresAnteriorseriea = cache.get("marcadoresseriea");
    const marcadoresAnteriorbundesliga = cache.get("marcadoresbundesliga");
    const marcadoresAnteriorligue1 = cache.get("marcadoresligue1");
    
    if (marcadoresAnterior) cache.set("marcadores_anterior", marcadoresAnterior);
    if (marcadoresAnteriorporemier) cache.set("marcadorespremier_anterior", marcadoresAnteriorporemier);
    if (marcadoresAnteriorlaliga) cache.set("marcadoreslaliga_anterior", marcadoresAnteriorlaliga);
    if (marcadoresAnteriorseriea) cache.set("marcadoresseriea_anterior", marcadoresAnteriorseriea);
    if (marcadoresAnteriorbundesliga) cache.set("marcadoresbundesliga_anterior", marcadoresAnteriorbundesliga);
    if (marcadoresAnteriorligue1) cache.set("marcadoresligue1_anterior", marcadoresAnteriorligue1);
    
    const [ligaMx, premier, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
      scrapMarcadoresLigaMX().catch(err => { console.error("Error marcadores Liga MX:", err.message); return null; }),
      scrapMarcadoresPremier().catch(err => { console.error("Error marcadores Premier:", err.message); return null; }),
      scrapMarcadoresLaLiga().catch(err => { console.error("Error marcadores La Liga:", err.message); return null; }),
      scrapMarcadoresSerieA().catch(err => { console.error("Error marcadores Serie A:", err.message); return null; }),
      scrapMarcadoresBundesliga().catch(err => { console.error("Error marcadores Bundesliga:", err.message); return null; }),
      scrapMarcadoresLigue1().catch(err => { console.error("Error marcadores Ligue 1:", err.message); return null; })
    ]);
    
    if (ligaMx) cache.set("marcadores", ligaMx);
    if (premier) cache.set("marcadorespremier", premier);
    if (laLiga) cache.set("marcadoreslaliga", laLiga);
    if (serieA) cache.set("marcadoresseriea", serieA);
    if (bundesliga) cache.set("marcadoresbundesliga", bundesliga);
    if (ligue1) cache.set("marcadoresligue1", ligue1);
    
    const totalPartidos = [ligaMx, premier, laLiga, serieA, bundesliga, ligue1]
      .filter(data => data && data.partidos)
      .reduce((total, data) => total + data.partidos.length, 0);
    
    const notificaciones = generarNotificaciones('todas');
    const notificacionesEventos = notificaciones.filter(n => 
      n.tipo === 'gol' || n.tipo === 'inicio_partido' || n.tipo === 'fin_primer_tiempo' || n.tipo === 'inicio_segundo_tiempo'
    );
    
    if (notificacionesEventos.length > 0) {
      console.log(`🔔 EVENTOS DETECTADOS: ${notificacionesEventos.length}`);
      notificacionesEventos.forEach(notif => {
        console.log(`   ${notif.titulo} - ${notif.mensaje}`);
      });
    }
    
    console.log(`✅ Marcadores actualizados: ${totalPartidos} partidos encontrados, ${notificaciones.length} notificaciones generadas`);
  } catch (error) {
    console.error("❌ Error actualizando marcadores:", error.message);
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/pelicula/:imdbId", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(path.join(__dirname, 'public', 'pelicula.html'));
});

app.get("/pelicula/tmdb/:tmdbId", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(path.join(__dirname, 'public', 'pelicula.html'));
});

app.get("/serie/tmdb/:tmdbId", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(path.join(__dirname, 'public', 'serie.html'));
});

app.get("/api/serie/tmdb/:tmdbId", async (req, res) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId);
    if (!tmdbId || isNaN(tmdbId)) return res.status(400).json({ error: 'TMDB ID inválido' });
    const data = await getSeriePorTmdb(tmdbId);
    res.json(data);
  } catch (err) {
    console.error('Error serie TMDB:', err.message);
    res.status(500).json({ error: 'Error obteniendo datos de la serie', detalle: err.message });
  }
});

app.get("/api/serie/tmdb/:tmdbId/season/:season", async (req, res) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId);
    const season = parseInt(req.params.season);
    if (!tmdbId || isNaN(tmdbId) || isNaN(season)) return res.status(400).json({ error: 'Parámetros inválidos' });
    const eps = await getEpisodiosPorTemporada(tmdbId, season);
    res.json(eps);
  } catch (err) {
    console.error('Error episodios:', err.message);
    res.status(500).json({ error: 'Error obteniendo episodios', detalle: err.message });
  }
});

app.get("/api/serie/tmdb/:tmdbId/poster", async (req, res) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId);
    if (!tmdbId || isNaN(tmdbId)) return res.status(400).end();
    const data = await getSeriePorTmdb(tmdbId);
    if (data.tmdb_poster) {
      const response = await axios.get(data.tmdb_poster, { responseType: 'arraybuffer', timeout: 8000 });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(response.data);
    }
    res.redirect(`https://via.placeholder.com/400x560/1a1a2e/a78bfa?text=${tmdbId}`);
  } catch (err) {
    res.redirect(`https://via.placeholder.com/400x560/1a1a2e/a78bfa?text=Serie`);
  }
});

app.delete("/api/serie/tmdb/:tmdbId/cache", (req, res) => {
  clearSerieCache(parseInt(req.params.tmdbId));
  res.json({ success: true });
});

app.get("/api/pelicula/tmdb/:tmdbId", async (req, res) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId);
    if (!tmdbId || isNaN(tmdbId)) {
      return res.status(400).json({ error: 'TMDB ID inválido. Debe ser un número.' });
    }
    const data = await scrapPeliculaPorTmdb(tmdbId);
    res.json(data);
  } catch (err) {
    console.error('Error scraping película por TMDB:', err.message);
    res.status(500).json({ error: 'Error obteniendo datos de la película', detalle: err.message });
  }
});

app.get("/api/pelicula/tmdb/:tmdbId/poster", async (req, res) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId);
    if (!tmdbId || isNaN(tmdbId)) return res.status(400).end();
    const meta = await tmdbToImdb(tmdbId);
    if (meta.tmdb_poster) {
      const response = await axios.get(meta.tmdb_poster, { responseType: 'arraybuffer', timeout: 8000 });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(response.data);
    }
    res.redirect(`https://via.placeholder.com/400x560/1a1a2e/00c6ff?text=${tmdbId}`);
  } catch (err) {
    res.redirect(`https://via.placeholder.com/400x560/1a1a2e/00c6ff?text=Sin+Poster`);
  }
});

app.get("/api/pelicula/:imdbId", async (req, res) => {
  try {
    const imdbId = req.params.imdbId.trim();
    if (!imdbId.match(/^tt\d+$/)) {
      return res.status(400).json({ error: 'IMDB ID inválido. Formato: tt0137523' });
    }
    const data = await scrapPelicula(imdbId);
    res.json(data);
  } catch (err) {
    console.error('Error scraping película:', err.message);
    res.status(500).json({ error: 'Error obteniendo datos de la película', detalle: err.message });
  }
});

app.get("/api/pelicula/:imdbId/poster", async (req, res) => {
  try {
    const imdbId = req.params.imdbId.trim();
    if (!imdbId.match(/^tt\d+$/)) return res.status(400).end();
    const posterUrl = `https://verhdlink.cam/posters_new/${imdbId}.jpg`;
    const response = await axios.get(posterUrl, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: {
        'Referer': 'https://verhdlink.cam/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
    });
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (err) {
    res.redirect(`https://via.placeholder.com/400x560/1a1a2e/00c6ff?text=${req.params.imdbId}`);
  }
});

app.delete("/api/pelicula/:imdbId/cache", (req, res) => {
  clearPeliculaCache(req.params.imdbId);
  res.json({ success: true, message: 'Cache limpiado' });
});

app.get("/api/buscar/pelicula", async (req, res) => {
  try {
    const { q, pagina = 1 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'Parámetro ?q= requerido' });
    const data = await buscarPelicula(q.trim(), parseInt(pagina));
    res.json(data);
  } catch (err) {
    console.error('Error buscando película:', err.message);
    res.status(500).json({ error: 'Error en búsqueda', detalle: err.message });
  }
});

app.get("/api/buscar/serie", async (req, res) => {
  try {
    const { q, pagina = 1 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'Parámetro ?q= requerido' });
    const data = await buscarSerie(q.trim(), parseInt(pagina));
    res.json(data);
  } catch (err) {
    console.error('Error buscando serie:', err.message);
    res.status(500).json({ error: 'Error en búsqueda', detalle: err.message });
  }
});

app.get("/api/buscar/todo", async (req, res) => {
  try {
    const { q, pagina = 1 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'Parámetro ?q= requerido' });
    const [peliculas, series] = await Promise.all([
      buscarPelicula(q.trim(), parseInt(pagina)).catch(() => ({ resultados: [], total_resultados: 0 })),
      buscarSerie(q.trim(), parseInt(pagina)).catch(() => ({ resultados: [], total_resultados: 0 }))
    ]);
    res.json({
      query: q.trim(),
      pagina: parseInt(pagina),
      peliculas: {
        total: peliculas.total_resultados,
        total_paginas: peliculas.total_paginas,
        resultados: peliculas.resultados
      },
      series: {
        total: series.total_resultados,
        total_paginas: series.total_paginas,
        resultados: series.resultados
      }
    });
  } catch (err) {
    console.error('Error en búsqueda combinada:', err.message);
    res.status(500).json({ error: 'Error en búsqueda', detalle: err.message });
  }
});

app.get("/l3ho-links", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'l3ho-links.html'));
});

app.get("/embed/l3ho-links", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'l3ho-links.html'));
});

app.get("/api", (req, res) => {
  res.json({
    nombre: "Multi-League Football API",
    version: "3.5.0",
    descripcion: "API con scraping en tiempo real de múltiples ligas de fútbol + Marcadores en vivo desde ESPN + Estadísticas detalladas en tiempo real",
    actualizacion: "Datos actualizados automáticamente cada 20 minutos",
    novedades: "NUEVO: Endpoint de estadísticas en tiempo real - Tarjetas, goles, pases, posesión, tiros, corners, faltas y más para cada partido",
    ligas_disponibles: {
      ligaMx: {
        nombre: "Liga MX",
        endpoints: {
          tabla: "/tabla",
          noticias: "/noticias",
          goleadores: "/goleadores",
          equipos: "/equipos",
          logos: "/logos",
          videos: "/videos",
          calendario: "/calendario",
          marcadores: "/marcadores",
          alineaciones: "/alineaciones",
          estadisticas: "/estadisticas",
          todo: "/todo"
        }
      },
      premierLeague: {
        nombre: "Premier League",
        endpoints: {
          tabla: "/premier/tabla",
          noticias: "/premier/noticias",
          goleadores: "/premier/goleadores",
          calendario: "/premier/calendario",
          marcadores: "/premier/marcadores",
          alineaciones: "/premier/alineaciones",
          estadisticas: "/premier/estadisticas",
          mejoresMomentos: "/premier/mejores-momentos"
        }
      },
      laLiga: {
        nombre: "La Liga",
        endpoints: {
          tabla: "/laliga/tabla",
          noticias: "/laliga/noticias",
          goleadores: "/laliga/goleadores",
          calendario: "/laliga/calendario",
          marcadores: "/laliga/marcadores",
          alineaciones: "/laliga/alineaciones",
          estadisticas: "/laliga/estadisticas",
          mejoresMomentos: "/laliga/mejores-momentos"
        }
      },
      serieA: {
        nombre: "Serie A",
        endpoints: {
          tabla: "/seriea/tabla",
          noticias: "/seriea/noticias",
          goleadores: "/seriea/goleadores",
          calendario: "/seriea/calendario",
          marcadores: "/seriea/marcadores",
          alineaciones: "/seriea/alineaciones",
          estadisticas: "/seriea/estadisticas",
          mejoresMomentos: "/seriea/mejores-momentos"
        }
      },
      bundesliga: {
        nombre: "Bundesliga",
        endpoints: {
          tabla: "/bundesliga/tabla",
          noticias: "/bundesliga/noticias",
          goleadores: "/bundesliga/goleadores",
          calendario: "/bundesliga/calendario",
          marcadores: "/bundesliga/marcadores",
          alineaciones: "/bundesliga/alineaciones",
          estadisticas: "/bundesliga/estadisticas",
          mejoresMomentos: "/bundesliga/mejores-momentos"
        }
      },
      ligue1: {
        nombre: "Ligue 1",
        endpoints: {
          tabla: "/ligue1/tabla",
          noticias: "/ligue1/noticias",
          goleadores: "/ligue1/goleadores",
          calendario: "/ligue1/calendario",
          marcadores: "/ligue1/marcadores",
          alineaciones: "/ligue1/alineaciones",
          estadisticas: "/ligue1/estadisticas",
          mejoresMomentos: "/ligue1/mejores-momentos"
        }
      }
    },
    endpoints_especiales: {
      todo_todas_las_ligas: {
        endpoint: "/todo-todas-las-ligas",
        porCategoria: "/todo-todas-las-ligas?categoria=CATEGORIA",
        ligaEspecifica: "/datafactory/:codigo",
        listarLigas: "/ligas-disponibles",
        descripcion: "NUEVO: Endpoint principal con TODAS las ligas del mundo - Sudamérica, Europa, CONCACAF, Asia, África, Mundiales FIFA y Fútbol Femenino",
        totalLigas: "70+ ligas disponibles",
        categorias: [
          "sudamericanas", "copas_conmebol", "europeas_top5", "europeas_otras",
          "copas_europeas", "uefa", "fifa_mundiales", "concacaf", "ligas_secundarias",
          "asiaticas", "internacionales", "femenino"
        ],
        caracteristicas: {
          partidos: "Todos los partidos con marcadores, estadio, hora, transmisión",
          tablaPosiciones: "Tabla de posiciones completa con estadísticas",
          equipos: "Información de equipos con logos, colores, estadio",
          estadisticas: "Estadísticas de goles, victorias, empates por liga",
          filtroPorCategoria: "Filtrar por categoría de liga (sudamericanas, uefa, etc)",
          ligaIndividual: "Obtener datos de una liga específica por código"
        }
      },
      todas_las_ligas: {
        calendario: "/calendario/todas-las-ligas",
        marcadores: "/marcadores/todas-las-ligas",
        alineaciones: "/alineaciones/todas-las-ligas",
        estadisticas: "/estadisticas/todas-las-ligas",
        descripcion: "Calendario, marcadores, alineaciones y estadísticas completas de las 6 ligas principales"
      },
      estadisticas_detalladas: {
        todasLasLigas: "/estadisticas/todas-las-ligas",
        porPartido: "/estadisticas/partido/:eventId",
        descripcion: "Estadísticas detalladas en tiempo real de cada partido",
        parametros: "?date=YYYYMMDD (opcional)",
        ejemplo: "/estadisticas/partido/12345",
        caracteristicas: {
          tarjetas: "Tarjetas amarillas y rojas con jugador, minuto y motivo",
          goles: "Goles con anotador, asistencia, minuto y tipo (penal, autogol, etc)",
          posesion: "Porcentaje de posesión por equipo",
          tiros: "Tiros totales, a portería, fuera y bloqueados",
          pases: "Pases totales, completados y precisión porcentual",
          corners: "Corners por equipo",
          faltas: "Faltas cometidas",
          fuerasDeJuego: "Offsides detectados",
          cambios: "Sustituciones con jugador que entra y sale",
          estadisticasJugadores: "Stats individuales de cada jugador (minutos, tiros, pases, etc)",
          comparativa: "Comparación lado a lado de estadísticas entre equipos"
        }
      },
      alineaciones_especificas: {
        porPartido: "/alineaciones/partido/:eventId",
        descripcion: "Alineación de un partido específico usando su ID de evento",
        ejemplo: "/alineaciones/partido/12345",
        caracteristicas: "Incluye fotos de jugadores, posiciones, números de camiseta, formación táctica, titulares y suplentes"
      },
      metricas_sistema: {
        alineaciones: "/alineaciones/stats",
        descripcion: "Métricas y estadísticas del sistema de alineaciones",
        incluye: "Cache hit rate, tasa de enriquecimiento de fotos, fuentes de datos utilizadas"
      },
      notificaciones: {
        todas: "/notificaciones",
        porLiga: "/notificaciones/:liga",
        estadisticas: "/notificaciones/stats",
        descripcion: "Sistema inteligente de notificaciones - Detecta GOLES en tiempo real, INICIO DE PARTIDO, FIN DEL PRIMER TIEMPO, partidos en vivo, próximos a iniciar (15min, 30min, 1h, 2h) y partidos del día",
        caracteristicas: {
          detectaGoles: "Notificación instantánea cuando un equipo anota",
          detectaInicioPartido: "Notificación al comenzar el partido",
          detectaFinPrimerTiempo: "Notificación al terminar el primer tiempo con marcador",
          detectaInicioSegundoTiempo: "Notificación al comenzar el segundo tiempo",
          partidosEnVivo: "Monitoreo continuo de partidos en curso",
          proximosPartidos: "Alertas 15min, 30min, 1h y 2h antes del inicio"
        }
      },
      transmisiones: {
        endpoint: "/transmisiones",
        descripcion: "Transmisiones deportivas en vivo con fechas, horarios y canales disponibles"
      },
      transmisiones2: {
        endpoint: "/transmisiones2",
        descripcion: "Transmisiones deportivas completas de todos los deportes (SOCCER, BASKETBALL, HOCKEY, TENNIS, VOLLEYBALL, etc.) con hora, liga y enlaces desde dp.mycraft.click"
      },
      transmisiones3: {
        endpoint: "/transmisiones3",
        descripcion: "Transmisiones deportivas de l1l1.link - Fuente alternativa con HOCKEY, FOOTBALL/SOCCER, BASKETBALL, AMERICAN FOOTBALL, MOTORSPORT. Incluye canal, ID y enlaces directos"
      },
      transmisiones4: {
        endpoint: "/transmisiones4",
        descripcion: "Transmisiones deportivas de ftvhd.com - Eventos internacionales con logos de equipos, país, banderas, múltiples opciones de canales y enlaces proxy listos para usar"
      },
      transmisiones5: {
        endpoint: "/transmisiones5",
        descripcion: "Transmisiones deportivas de donromans.com - API de WordPress con eventos deportivos organizados por liga, hora, país, incluye múltiples enlaces de transmisión (urls_list, SpecialLinks, canales, servidores) con compatibilidad y modo replay"
      },
      transmisiones6: {
        endpoint: "/transmisiones6",
        descripcion: "API Oficial UltraGol (dp.mycraft.click) - Transmisiones deportivas profesionales de múltiples deportes (fútbol, hockey, baloncesto, etc.) con protección Cloudflare, horarios, ligas y enlaces listos para reproducir"
      },
      "ultragol-l3ho": {
        endpoint: "/ultragol-l3ho",
        parametro: "?get=URL_DEL_STREAM",
        descripcion: "Proxy bloqueador de anuncios para streams - Limpia HTML, elimina scripts maliciosos, bloquea dominios de ads y extrae solo el reproductor de video",
        ejemplo: "/ultragol-l3ho?get=https://ejemplo.com/player",
        caracteristicas: {
          bloqueoAds: "Filtra dominios de publicidad conocidos",
          limpiezaHTML: "Elimina scripts, popups, overlays y elementos de anuncios",
          soporteHLS: "Filtra segmentos de anuncios en playlists m3u8",
          seguridad: "Validación de URLs y protección contra SSRF"
        }
      },
      parametros_marcadores: {
        date: "?date=YYYYMMDD (opcional)",
        ejemplo: "/marcadores?date=20251021",
        descripcion: "Obtener marcadores de una fecha específica en formato YYYYMMDD"
      }
    },
    estado: "Activo",
    proxima_actualizacion: "20 minutos"
  });
});

app.get("/resultados/todas-las-ligas", async (req, res) => {
  try {
    const dateQuery = req.query.date;
    const cacheKey = dateQuery ? `resultados_todas_${dateQuery}` : "resultados_todas_hoy";
    
    let cachedData = cache.get(cacheKey);
    if (!cachedData) {
      console.log(`⚽ Obteniendo resultados de todas las ligas...`);
      
      const datesToFetch = [];
      if (dateQuery) {
        datesToFetch.push(dateQuery);
      } else {
        // Generar las fechas de la última semana
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          datesToFetch.push(`${year}${month}${day}`);
        }
      }

      const resultsByDate = await Promise.all(datesToFetch.map(async (date) => {
        const [ligaMx, premier, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
          scrapMarcadoresLigaMX(date).catch(() => null),
          scrapMarcadoresPremier(date).catch(() => null),
          scrapMarcadoresLaLiga(date).catch(() => null),
          scrapMarcadoresSerieA(date).catch(() => null),
          scrapMarcadoresBundesliga(date).catch(() => null),
          scrapMarcadoresLigue1(date).catch(() => null)
        ]);

        const todas = [ligaMx, premier, laLiga, serieA, bundesliga, ligue1].filter(l => l !== null);
        
        return {
          fecha: date,
          ligas: todas.map(liga => ({
            liga: liga.liga,
            total: liga.total,
            finalizados: liga.partidos.filter(p => p.estado.finalizado),
            en_vivo: liga.partidos.filter(p => p.estado.enVivo),
            programados: liga.partidos.filter(p => p.estado.programado)
          }))
        };
      }));

      cachedData = {
        success: true,
        actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
        periodo: dateQuery ? `Fecha específica: ${dateQuery}` : "Últimos 7 días (Histórico semanal)",
        resultados: resultsByDate
      };
      
      cache.set(cacheKey, cachedData, 1800); // 30 minutos de caché
    }
    
    res.json(cachedData);
  } catch (error) {
    console.error("Error en /resultados/todas-las-ligas:", error.message);
    res.status(500).json({ error: "Error al obtener los resultados", detalles: error.message });
  }
});

app.get("/marcadores/todas-las-ligas", async (req, res) => {
  try {
    const date = req.query.date || null;
    const cacheKey = date ? `marcadores_todas_${date}` : "marcadores_todas_hoy";
    
    let data = cache.get(cacheKey);
    if (!data) {
      console.log(`⚽ Obteniendo marcadores de todas las ligas ${date ? 'para ' + date : 'de hoy'}...`);
      
      const [ligaMx, premier, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
        scrapMarcadoresLigaMX(date).catch(() => null),
        scrapMarcadoresPremier(date).catch(() => null),
        scrapMarcadoresLaLiga(date).catch(() => null),
        scrapMarcadoresSerieA(date).catch(() => null),
        scrapMarcadoresBundesliga(date).catch(() => null),
        scrapMarcadoresLigue1(date).catch(() => null)
      ]);

      data = {
        success: true,
        actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
        fecha_consulta: date || 'hoy',
        ligas: [ligaMx, premier, laLiga, serieA, bundesliga, ligue1].filter(l => l !== null)
      };
      
      cache.set(cacheKey, data, 600);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /marcadores/todas-las-ligas:", error.message);
    res.status(500).json({ error: "Error al obtener marcadores", detalles: error.message });
  }
});

app.get("/tabla", async (req, res) => {
  try {
    let data = cache.get("tabla");
    
    if (!data) {
      console.log("📊 Obteniendo tabla (caché vacío)...");
      data = await scrapTabla();
      cache.set("tabla", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /tabla:", error.message);
    res.status(500).json({ 
      error: "No se pudo obtener la tabla de posiciones",
      detalles: error.message 
    });
  }
});

app.get("/noticias", async (req, res) => {
  try {
    let data = cache.get("noticias");
    
    if (!data) {
      console.log("📰 Obteniendo noticias (caché vacío)...");
      data = await scrapNoticias();
      cache.set("noticias", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /noticias:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las noticias",
      detalles: error.message 
    });
  }
});

app.get("/goleadores", async (req, res) => {
  try {
    let data = cache.get("goleadores");
    
    if (!data) {
      console.log("⚽ Obteniendo goleadores (caché vacío)...");
      data = await scrapGoleadores();
      cache.set("goleadores", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /goleadores:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los goleadores",
      detalles: error.message 
    });
  }
});

app.get("/equipos", async (req, res) => {
  try {
    let data = cache.get("equipos");
    
    if (!data) {
      console.log("🏟️ Obteniendo equipos (caché vacío)...");
      data = await scrapEquipos();
      cache.set("equipos", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /equipos:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los equipos",
      detalles: error.message 
    });
  }
});

app.get("/logos", async (req, res) => {
  try {
    let data = cache.get("logos");
    
    if (!data) {
      console.log("🎨 Obteniendo logos (caché vacío)...");
      data = await scrapLogos();
      cache.set("logos", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /logos:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los logos",
      detalles: error.message 
    });
  }
});

app.get("/videos", async (req, res) => {
  try {
    let data = cache.get("videos");
    
    if (!data) {
      console.log("🎬 Obteniendo videos de YouTube (caché vacío)...");
      data = await scrapVideos();
      cache.set("videos", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /videos:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los videos",
      detalles: error.message 
    });
  }
});

app.get("/calendario", async (req, res) => {
  try {
    let data = cache.get("calendario");
    
    if (!data) {
      console.log("📅 Obteniendo calendario (caché vacío)...");
      data = await scrapCalendario();
      cache.set("calendario", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /calendario:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los calendario",
      detalles: error.message 
    });
  }
});

app.get("/todo", async (req, res) => {
  try {
    const tabla = cache.get("tabla") || await scrapTabla().catch(() => null);
    const noticias = cache.get("noticias") || await scrapNoticias().catch(() => null);
    const goleadores = cache.get("goleadores") || await scrapGoleadores().catch(() => null);
    const equipos = cache.get("equipos") || await scrapEquipos().catch(() => null);
    const logos = cache.get("logos") || await scrapLogos().catch(() => null);
    const videos = cache.get("videos") || await scrapVideos().catch(() => null);
    const calendario = cache.get("calendario") || await scrapCalendario().catch(() => null);
    
    res.json({
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      tabla: tabla,
      noticias: noticias,
      goleadores: goleadores,
      equipos: equipos,
      logos: logos,
      videos: videos,
      calendario: calendario
    });
  } catch (error) {
    console.error("Error en /todo:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener todos los datos",
      detalles: error.message 
    });
  }
});

app.get("/premier/tabla", async (req, res) => {
  try {
    let data = cache.get("premier_tabla");
    if (!data) {
      console.log("📊 Obteniendo tabla Premier League...");
      data = await scrapTablaPremier();
      cache.set("premier_tabla", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/tabla:", error.message);
    res.status(500).json({ error: "Could not fetch Premier League standings", detalles: error.message });
  }
});

app.get("/premier/noticias", async (req, res) => {
  try {
    let data = cache.get("premier_noticias");
    if (!data) {
      console.log("📰 Obteniendo noticias Premier League...");
      data = await scrapNoticiasPremier();
      cache.set("premier_noticias", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/noticias:", error.message);
    res.status(500).json({ error: "Could not fetch Premier League news", detalles: error.message });
  }
});

app.get("/premier/goleadores", async (req, res) => {
  try {
    let data = cache.get("premier_goleadores");
    if (!data) {
      console.log("⚽ Obteniendo goleadores Premier League...");
      data = await scrapGoleadoresPremier();
      cache.set("premier_goleadores", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/goleadores:", error.message);
    res.status(500).json({ error: "Could not fetch Premier League top scorers", detalles: error.message });
  }
});

app.get("/premier/calendario", async (req, res) => {
  try {
    let data = cache.get("premier_calendario");
    if (!data) {
      console.log("📅 Obteniendo calendario Premier League...");
      data = await scrapCalendarioPremier();
      cache.set("premier_calendario", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/calendario:", error.message);
    res.status(500).json({ error: "Could not fetch Premier League fixtures", detalles: error.message });
  }
});

app.get("/premier/mejores-momentos", async (req, res) => {
  try {
    let data = cache.get("premier_mejores_momentos");
    if (!data) {
      console.log("🎬 Obteniendo mejores momentos Premier League...");
      data = await scrapMejoresMomentosPremier();
      cache.set("premier_mejores_momentos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/mejores-momentos:", error.message);
    res.status(500).json({ error: "Could not fetch Premier League highlights", detalles: error.message });
  }
});

app.get("/laliga/tabla", async (req, res) => {
  try {
    let data = cache.get("laliga_tabla");
    if (!data) {
      console.log("📊 Obteniendo tabla La Liga...");
      data = await scrapTablaLaLiga();
      cache.set("laliga_tabla", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/tabla:", error.message);
    res.status(500).json({ error: "No se pudo obtener la tabla de La Liga", detalles: error.message });
  }
});

app.get("/laliga/noticias", async (req, res) => {
  try {
    let data = cache.get("laliga_noticias");
    if (!data) {
      console.log("📰 Obteniendo noticias La Liga...");
      data = await scrapNoticiasLaLiga();
      cache.set("laliga_noticias", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/noticias:", error.message);
    res.status(500).json({ error: "No se pudieron obtener las noticias de La Liga", detalles: error.message });
  }
});

app.get("/laliga/goleadores", async (req, res) => {
  try {
    let data = cache.get("laliga_goleadores");
    if (!data) {
      console.log("⚽ Obteniendo goleadores La Liga...");
      data = await scrapGoleadoresLaLiga();
      cache.set("laliga_goleadores", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/goleadores:", error.message);
    res.status(500).json({ error: "No se pudieron obtener los goleadores de La Liga", detalles: error.message });
  }
});

app.get("/laliga/calendario", async (req, res) => {
  try {
    let data = cache.get("laliga_calendario");
    if (!data) {
      console.log("📅 Obteniendo calendario La Liga...");
      data = await scrapCalendarioLaLiga();
      cache.set("laliga_calendario", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/calendario:", error.message);
    res.status(500).json({ error: "No se pudieron obtener los calendario de La Liga", detalles: error.message });
  }
});

app.get("/laliga/mejores-momentos", async (req, res) => {
  try {
    let data = cache.get("laliga_mejores_momentos");
    if (!data) {
      console.log("🎬 Obteniendo mejores momentos La Liga...");
      data = await scrapMejoresMomentosLaLiga();
      cache.set("laliga_mejores_momentos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/mejores-momentos:", error.message);
    res.status(500).json({ error: "No se pudieron obtener los mejores momentos de La Liga", detalles: error.message });
  }
});

app.get("/seriea/tabla", async (req, res) => {
  try {
    let data = cache.get("seriea_tabla");
    if (!data) {
      console.log("📊 Obteniendo tabla Serie A...");
      data = await scrapTablaSerieA();
      cache.set("seriea_tabla", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/tabla:", error.message);
    res.status(500).json({ error: "Impossibile ottenere la classifica di Serie A", detalles: error.message });
  }
});

app.get("/seriea/noticias", async (req, res) => {
  try {
    let data = cache.get("seriea_noticias");
    if (!data) {
      console.log("📰 Obteniendo noticias Serie A...");
      data = await scrapNoticiasSerieA();
      cache.set("seriea_noticias", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/noticias:", error.message);
    res.status(500).json({ error: "Impossibile ottenere le notizie di Serie A", detalles: error.message });
  }
});

app.get("/seriea/goleadores", async (req, res) => {
  try {
    let data = cache.get("seriea_goleadores");
    if (!data) {
      console.log("⚽ Obteniendo goleadores Serie A...");
      data = await scrapGoleadoresSerieA();
      cache.set("seriea_goleadores", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/goleadores:", error.message);
    res.status(500).json({ error: "Impossibile ottenere i capocannonieri di Serie A", detalles: error.message });
  }
});

app.get("/seriea/calendario", async (req, res) => {
  try {
    let data = cache.get("seriea_calendario");
    if (!data) {
      console.log("📅 Obteniendo calendario Serie A...");
      data = await scrapCalendarioSerieA();
      cache.set("seriea_calendario", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/calendario:", error.message);
    res.status(500).json({ error: "Impossibile ottenere le prossime partite di Serie A", detalles: error.message });
  }
});

app.get("/seriea/mejores-momentos", async (req, res) => {
  try {
    let data = cache.get("seriea_mejores_momentos");
    if (!data) {
      console.log("🎬 Obteniendo mejores momentos Serie A...");
      data = await scrapMejoresMomentosSerieA();
      cache.set("seriea_mejores_momentos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/mejores-momentos:", error.message);
    res.status(500).json({ error: "Impossibile ottenere i migliori momenti di Serie A", detalles: error.message });
  }
});

app.get("/bundesliga/tabla", async (req, res) => {
  try {
    let data = cache.get("bundesliga_tabla");
    if (!data) {
      console.log("📊 Obteniendo tabla Bundesliga...");
      data = await scrapTablaBundesliga();
      cache.set("bundesliga_tabla", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/tabla:", error.message);
    res.status(500).json({ error: "Bundesliga-Tabelle konnte nicht abgerufen werden", detalles: error.message });
  }
});

app.get("/bundesliga/noticias", async (req, res) => {
  try {
    let data = cache.get("bundesliga_noticias");
    if (!data) {
      console.log("📰 Obteniendo noticias Bundesliga...");
      data = await scrapNoticiasBundesliga();
      cache.set("bundesliga_noticias", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/noticias:", error.message);
    res.status(500).json({ error: "Bundesliga-Nachrichten konnten nicht abgerufen werden", detalles: error.message });
  }
});

app.get("/bundesliga/goleadores", async (req, res) => {
  try {
    let data = cache.get("bundesliga_goleadores");
    if (!data) {
      console.log("⚽ Obteniendo goleadores Bundesliga...");
      data = await scrapGoleadoresBundesliga();
      cache.set("bundesliga_goleadores", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/goleadores:", error.message);
    res.status(500).json({ error: "Bundesliga-Torschützenliste konnte nicht abgerufen werden", detalles: error.message });
  }
});

app.get("/bundesliga/calendario", async (req, res) => {
  try {
    let data = cache.get("bundesliga_calendario");
    if (!data) {
      console.log("📅 Obteniendo calendario Bundesliga...");
      data = await scrapCalendarioBundesliga();
      cache.set("bundesliga_calendario", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/calendario:", error.message);
    res.status(500).json({ error: "Bundesliga-Spielplan konnte nicht abgerufen werden", detalles: error.message });
  }
});

app.get("/bundesliga/mejores-momentos", async (req, res) => {
  try {
    let data = cache.get("bundesliga_mejores_momentos");
    if (!data) {
      console.log("🎬 Obteniendo mejores momentos Bundesliga...");
      data = await scrapMejoresMomentosBundesliga();
      cache.set("bundesliga_mejores_momentos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/mejores-momentos:", error.message);
    res.status(500).json({ error: "Bundesliga-Highlights konnten nicht abgerufen werden", detalles: error.message });
  }
});

app.get("/ligue1/tabla", async (req, res) => {
  try {
    let data = cache.get("ligue1_tabla");
    if (!data) {
      console.log("📊 Obteniendo tabla Ligue 1...");
      data = await scrapTablaLigue1();
      cache.set("ligue1_tabla", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/tabla:", error.message);
    res.status(500).json({ error: "Impossible d'obtenir le classement de Ligue 1", detalles: error.message });
  }
});

app.get("/ligue1/noticias", async (req, res) => {
  try {
    let data = cache.get("ligue1_noticias");
    if (!data) {
      console.log("📰 Obteniendo noticias Ligue 1...");
      data = await scrapNoticiasLigue1();
      cache.set("ligue1_noticias", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/noticias:", error.message);
    res.status(500).json({ error: "Impossible d'obtenir les actualités de Ligue 1", detalles: error.message });
  }
});

app.get("/ligue1/goleadores", async (req, res) => {
  try {
    let data = cache.get("ligue1_goleadores");
    if (!data) {
      console.log("⚽ Obteniendo goleadores Ligue 1...");
      data = await scrapGoleadoresLigue1();
      cache.set("ligue1_goleadores", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/goleadores:", error.message);
    res.status(500).json({ error: "Impossible d'obtenir les meilleurs buteurs de Ligue 1", detalles: error.message });
  }
});

app.get("/ligue1/calendario", async (req, res) => {
  try {
    let data = cache.get("ligue1_calendario");
    if (!data) {
      console.log("📅 Obteniendo calendario Ligue 1...");
      data = await scrapCalendarioLigue1();
      cache.set("ligue1_calendario", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/calendario:", error.message);
    res.status(500).json({ error: "Impossible d'obtenir les prochains matchs de Ligue 1", detalles: error.message });
  }
});

app.get("/ligue1/mejores-momentos", async (req, res) => {
  try {
    let data = cache.get("ligue1_mejores_momentos");
    if (!data) {
      console.log("🎬 Obteniendo mejores momentos Ligue 1...");
      data = await scrapMejoresMomentosLigue1();
      cache.set("ligue1_mejores_momentos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/mejores-momentos:", error.message);
    res.status(500).json({ error: "Impossible d'obtenir les meilleurs moments de Ligue 1", detalles: error.message });
  }
});

app.get("/todo-todas-las-ligas", async (req, res) => {
  try {
    console.log("🌎 Obteniendo TODO de TODAS las ligas de DataFactory...");
    
    let data = cache.get("datafactory_todas");
    
    if (!data) {
      data = await scrapTodasLasLigasDataFactory();
      cache.set("datafactory_todas", data, 600000);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /todo-todas-las-ligas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los datos de todas las ligas",
      detalles: error.message 
    });
  }
});

app.get("/datafactory/:pais", async (req, res) => {
  try {
    const pais = req.params.pais.toLowerCase();
    const paisesDisponibles = Object.keys(DATAFACTORY_URLS);
    
    if (!paisesDisponibles.includes(pais)) {
      return res.status(400).json({
        error: "País no disponible",
        paisesDisponibles: paisesDisponibles,
        ejemplo: "/datafactory/ecuador"
      });
    }
    
    console.log(`⚽ Obteniendo datos de DataFactory ${pais.toUpperCase()}...`);
    
    let data = cache.get(`datafactory_${pais}`);
    
    if (!data) {
      data = await scrapDataFactoryLiga(pais);
      cache.set(`datafactory_${pais}`, data, 300000);
    }
    
    res.json(data);
  } catch (error) {
    console.error(`Error en /datafactory/${req.params.pais}:`, error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los datos",
      detalles: error.message 
    });
  }
});

app.get("/datafactory", (req, res) => {
  res.json({
    nombre: "DataFactory API",
    descripcion: "Scraping completo de ligas de fútbol de Latinoamérica desde DataFactory",
    version: "1.0.0",
    endpoints: {
      todasLasLigas: {
        url: "/todo-todas-las-ligas",
        descripcion: "Obtiene datos completos de TODAS las ligas disponibles"
      },
      porPais: {
        url: "/datafactory/:pais",
        descripcion: "Obtiene datos de una liga específica por país",
        ejemplo: "/datafactory/ecuador"
      }
    },
    paisesDisponibles: Object.keys(DATAFACTORY_URLS).map(pais => ({
      codigo: pais,
      url: `/datafactory/${pais}`
    })),
    datosIncluidos: [
      "Partidos completos con marcadores",
      "Equipos locales y visitantes con logos",
      "Jornadas organizadas",
      "Árbitros de cada partido",
      "Fechas y horarios",
      "Estados de partidos (Finalizado, En Vivo, Programado)",
      "Tabla de posiciones calculada",
      "Estadísticas completas (goles, victorias, empates, derrotas)",
      "Análisis de goleadas",
      "Porcentajes de rendimiento"
    ],
    actualizacion: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
  });
});

app.get("/calendario/todas-las-ligas", async (req, res) => {
  try {
    console.log("🌍 Obteniendo calendarios de todas las ligas...");
    
    const [ligaMx, premierLeague, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
      (cache.get("calendario") || scrapCalendario().catch(err => { console.error("Error Liga MX:", err.message); return null; })),
      (cache.get("premier_calendario") || scrapCalendarioPremier().catch(err => { console.error("Error Premier:", err.message); return null; })),
      (cache.get("laliga_calendario") || scrapCalendarioLaLiga().catch(err => { console.error("Error La Liga:", err.message); return null; })),
      (cache.get("seriea_calendario") || scrapCalendarioSerieA().catch(err => { console.error("Error Serie A:", err.message); return null; })),
      (cache.get("bundesliga_calendario") || scrapCalendarioBundesliga().catch(err => { console.error("Error Bundesliga:", err.message); return null; })),
      (cache.get("ligue1_calendario") || scrapCalendarioLigue1().catch(err => { console.error("Error Ligue 1:", err.message); return null; }))
    ]);

    const todasLasLigas = {
      actualizado: new Date().toISOString(),
      totalLigas: 6,
      ligas: [
        {
          nombre: "Liga MX",
          pais: "México",
          codigo: "ligamx",
          totalPartidos: ligaMx?.total || 0,
          calendario: ligaMx?.calendario || []
        },
        {
          nombre: "Premier League",
          pais: "Inglaterra",
          codigo: "premier",
          totalPartidos: premierLeague?.total || 0,
          calendario: premierLeague?.calendario || []
        },
        {
          nombre: "La Liga",
          pais: "España",
          codigo: "laliga",
          totalPartidos: laLiga?.total || 0,
          calendario: laLiga?.calendario || []
        },
        {
          nombre: "Serie A",
          pais: "Italia",
          codigo: "seriea",
          totalPartidos: serieA?.total || 0,
          calendario: serieA?.calendario || []
        },
        {
          nombre: "Bundesliga",
          pais: "Alemania",
          codigo: "bundesliga",
          totalPartidos: bundesliga?.total || 0,
          calendario: bundesliga?.calendario || []
        },
        {
          nombre: "Ligue 1",
          pais: "Francia",
          codigo: "ligue1",
          totalPartidos: ligue1?.total || 0,
          calendario: ligue1?.calendario || []
        }
      ],
      totalPartidos: 
        (ligaMx?.total || 0) + 
        (premierLeague?.total || 0) + 
        (laLiga?.total || 0) + 
        (serieA?.total || 0) + 
        (bundesliga?.total || 0) + 
        (ligue1?.total || 0)
    };

    res.json(todasLasLigas);
  } catch (error) {
    console.error("Error en /calendario/todas-las-ligas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los calendarios",
      detalles: error.message 
    });
  }
});


/* ── ENCODE LINKS ──────────────────────────────────────────────────────────
   Recorre recursivamente un objeto y codifica en Base64 todas las URLs de
   streams, excluyendo campos de imágenes/logos para no romper los displays.
────────────────────────────────────────────────────────────────────────── */
const ENCODE_SKIP_KEYS = new Set([
  'logo1','logo2','logoUrl','logo','imagen','flag','thumbnail','image','img',
  'fuente','source','actualizado','fecha','hora','liga','deporte','sport',
  'evento','titulo','canal','nombre','idioma','slug','equipo1','equipo2',
  'descripcion','calidad','estado','info','id','type','key'
]);

function encodeLinks(obj, parentKey = null) {
  if (typeof obj === 'string') {
    if (parentKey && ENCODE_SKIP_KEYS.has(parentKey)) return obj;
    if (/^https?:\/\//i.test(obj)) {
      return Buffer.from(obj).toString('base64');
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(item => encodeLinks(item, null));
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const k of Object.keys(obj)) result[k] = encodeLinks(obj[k], k);
    return result;
  }
  return obj;
}

function applyBolalocoProxy(obj, baseUrl) {
  if (typeof obj === "string") {
    // Caso 1: URL directa de bolaloca.my
    if (/^https?:\/\/(www\.)?bolaloca\.my/i.test(obj)) {
      return `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(obj)}`;
    }
    // Caso 2: URL directa de streams.center
    if (/^https?:\/\/(www\.)?streams\.center/i.test(obj)) {
      return `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(obj)}`;
    }
    // Caso 3: URL envuelta en GLZ_PROXY externo (ultragol-l3ho?get=...)
    const glzMatch = obj.match(/ultragol-l3ho\?get=(.+)/);
    if (glzMatch) {
      try {
        const inner = decodeURIComponent(glzMatch[1]);
        if (/^https?:\/\/(www\.)?bolaloca\.my/i.test(inner)) {
          return `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(inner)}`;
        }
        if (/^https?:\/\/(www\.)?streams\.center/i.test(inner)) {
          return `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(inner)}`;
        }
      } catch {}
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(item => applyBolalocoProxy(item, baseUrl));
  if (obj && typeof obj === "object") {
    const result = {};
    for (const key of Object.keys(obj)) result[key] = applyBolalocoProxy(obj[key], baseUrl);
    return result;
  }
  return obj;
}

app.get("/gol-1", async (req, res) => {
  try {
    let data = cache.get("transmisiones");

    if (!data) {
      console.log("📺 Obteniendo transmisiones deportivas (caché vacío)...");
      try {
        data = await scrapTransmisiones();
        cache.set("transmisiones", data);
      } catch (fetchError) {
        const staleData = cache.getStale("transmisiones");
        if (staleData) {
          console.warn("⚠️ Usando caché stale para transmisiones:", fetchError.message);
          return res.json({ ...staleData, _stale: true });
        }
        throw fetchError;
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Error en /transmisiones:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas",
      detalles: error.message 
    });
  }
});

app.get("/gol-2", async (req, res) => {
  try {
    let data = cache.get("transmisiones2");

    if (!data) {
      console.log("📺 Obteniendo eventos desde la18hd.com (caché vacío)...");
      try {
        data = await scrapTransmisiones2();
        if (data && data.total > 0) {
          cache.set("transmisiones2", data, 15 * 60);
        }
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones2");
        if (staleData && staleData.total > 0) {
          console.warn("⚠️ Usando caché stale para gol-2:", scrapeError.message);
          return res.json({ ...staleData, _stale: true });
        }
        throw scrapeError;
      }
    }

    const base = `${req.protocol}://${req.get("host")}`;
    const proxied = {
      ...data,
      transmisiones: (data.transmisiones || []).map(ev => ({
        ...ev,
        canales: (ev.canales || []).map(c => {
          const proxiedLink = c.link ? `${base}/hls-canal?url=${encodeURIComponent(c.link)}` : null;
          const playerUrl = proxiedLink
            ? `${base}/canal-player?url=${encodeURIComponent(proxiedLink)}&nombre=${encodeURIComponent(ev.titulo + (c.nombre ? " - " + c.nombre : ""))}`
            : null;
          return { ...c, link: proxiedLink, url: playerUrl };
        })
      }))
    };
    res.json(proxied);
  } catch (error) {
    console.error("Error en /gol-2:", error.message);
    res.status(500).json({
      error: "No se pudieron obtener los eventos desde la18hd.com",
      detalles: error.message
    });
  }
});

app.get("/gol-3", async (req, res) => {
  try {
    let data = cache.get("transmisiones3");

    if (!data) {
      console.log("📺 Obteniendo transmisiones desde tvtvhd.com (caché vacío)...");
      try {
        data = await scrapTransmisiones3();
        if (data && data.total > 0) {
          cache.set("transmisiones3", data, 15 * 60);
        }
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones3");
        if (staleData && staleData.total > 0) {
          console.warn("⚠️ Usando caché stale para gol-3:", scrapeError.message);
          return res.json({ ...staleData, _stale: true });
        }
        throw scrapeError;
      }
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const response = {
      ...data,
      transmisiones: (data.transmisiones || []).map(t => {
        const proxiedM3u8 = t.m3u8 ? `${baseUrl}/hls-canal?url=${encodeURIComponent(t.m3u8)}` : null;
        const url = proxiedM3u8
          ? `${baseUrl}/canal-player?url=${encodeURIComponent(proxiedM3u8)}&nombre=${encodeURIComponent(t.titulo || t.canal || "En vivo")}`
          : null;
        const { m3u8: _removed, ...rest } = t;
        return { ...rest, url };
      })
    };
    res.json(response);
  } catch (error) {
    console.error("Error en /gol-3:", error.message);
    res.status(500).json({
      error: "No se pudieron obtener las transmisiones desde tvtvhd.com",
      detalles: error.message
    });
  }
});

app.get("/gol-4", async (req, res) => {
  try {
    let data = cache.get("transmisiones4");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones deportivas desde ftvhd.com (caché vacío)...");
      try {
        data = await scrapTransmisiones4();
        
        if (data && data.total > 0) {
          cache.set("transmisiones4", data);
        } else if (data && data.error) {
          const staleData = cache.getStale("transmisiones4");
          if (staleData && staleData.total > 0) {
            console.log("⚠️ Usando datos en caché (expirados) debido a bloqueo del sitio");
            data = {
              ...staleData,
              advertencia: "Datos del caché (pueden no estar actualizados). El sitio web está bloqueando peticiones nuevas.",
              ultimaActualizacion: staleData.actualizado
            };
          }
        }
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones4");
        if (staleData && staleData.total > 0) {
          console.log("⚠️ Usando datos en caché (expirados) debido a error en scraping");
          data = {
            ...staleData,
            advertencia: "Datos del caché (pueden no estar actualizados). Error al obtener datos nuevos: " + scrapeError.message,
            ultimaActualizacion: staleData.actualizado
          };
        } else {
          throw scrapeError;
        }
      }
    }
    
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const enriched = {
      ...data,
      transmisiones: (data.transmisiones || []).map(t => ({
        ...t,
        canales: (t.canales || []).map(c => ({
          ...c,
          url: c.url ? `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(c.url)}` : c.url
        }))
      }))
    };
    res.json(enriched);
  } catch (error) {
    console.error("Error en /transmisiones4:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde ftvhd.com",
      detalles: error.message,
      sugerencia: "El sitio web puede estar bloqueando las peticiones. Intenta de nuevo más tarde."
    });
  }
});

app.get("/gol-5", async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  try {
    let data = cache.get("transmisiones5");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones EN TIEMPO REAL desde donromans.com API (caché vacío)...");
      try {
        data = await scrapTransmisiones5();
        
        if (data && data.success && data.totalMatches > 0) {
          cache.set("transmisiones5", data, 300);
          return res.json(data);
        } else if (data && !data.success) {
          const staleData = cache.getStale("transmisiones5");
          if (staleData && staleData.success && staleData.totalMatches > 0) {
            console.log("⚠️ Usando datos en caché (expirados) debido a error en la API");
            data = {
              ...staleData,
              advertencia: "Datos del caché (pueden no estar actualizados). Error al obtener datos nuevos de la API.",
              ultimaActualizacion: staleData.timestamp
            };
            return res.json(data);
          }
          
          if (data.error && data.error.includes("No hay eventos programados")) {
            return res.status(404).json({
              success: false,
              source: "donromans.com API",
              timestamp: data.timestamp,
              eventDate: data.eventDate,
              error: data.error,
              totalMatches: 0,
              matches: []
            });
          }
          
          return res.status(502).json({
            success: false,
            source: "donromans.com API",
            timestamp: data.timestamp,
            eventDate: data.eventDate,
            error: data.error || "Error al obtener datos de la API",
            totalMatches: 0,
            matches: []
          });
        }
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones5");
        if (staleData && staleData.success && staleData.totalMatches > 0) {
          console.log("⚠️ Usando datos en caché (expirados) debido a error en scraping");
          data = {
            ...staleData,
            advertencia: "Datos del caché (pueden no estar actualizados). Error al obtener datos nuevos: " + scrapeError.message,
            ultimaActualizacion: staleData.timestamp
          };
          return res.json(data);
        }
        
        return res.status(502).json({
          success: false,
          source: "donromans.com API",
          timestamp: new Date().toISOString(),
          eventDate: new Date().toISOString().split('T')[0],
          error: scrapeError.message,
          totalMatches: 0,
          matches: []
        });
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /transmisiones5:", error.message);
    res.status(500).json({ 
      success: false,
      source: "donromans.com API",
      timestamp: new Date().toISOString(),
      eventDate: new Date().toISOString().split('T')[0],
      error: error.message,
      totalMatches: 0,
      matches: []
    });
  }
});

app.get("/gol-6", async (req, res) => {
  try {
    let data = cache.get("transmisiones6");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones desde UltraGol API (dp.mycraft.click) - caché vacío...");
      try {
        data = await scrapTransmisiones6();
        cache.set("transmisiones6", data, 600);
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones6");
        if (staleData && staleData.total > 0) {
          console.log("⚠️ Usando datos en caché (expirados) debido a error en scraping");
          data = {
            ...staleData,
            advertencia: "Datos del caché (pueden no estar actualizados). Error al obtener datos nuevos: " + scrapeError.message,
            ultimaActualizacion: staleData.actualizado
          };
        } else {
          throw scrapeError;
        }
      }
    }
    
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const enriched = {
      ...data,
      transmisiones: (data.transmisiones || []).map(t => ({
        ...t,
        fuentes: (t.fuentes || []).map(f => {
          const streamUrl = `${baseUrl}/streamed-stream?source=${encodeURIComponent(f.fuente)}&id=${encodeURIComponent(f.id)}`;
          return { ...f, url: streamUrl };
        })
      }))
    };
    res.json(enriched);
  } catch (error) {
    console.error("Error en /transmisiones6:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde UltraGol API",
      detalles: error.message,
      sugerencia: "El sitio web podría estar bloqueando las peticiones o Cloudflare está activo. Intenta de nuevo más tarde."
    });
  }
});

app.get("/streamed-stream", async (req, res) => {
  const { source, id } = req.query;
  if (!source || !id) return res.status(400).json({ error: "Faltan parámetros ?source= y ?id=" });

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  // Sirve un player iframe directo cuando no podemos extraer m3u8 server-side
  function serveIframePlayer(embedUrl, label) {
    console.log(`📺 streamed-stream [${source}/${id}] → iframe fallback (${label}): ${embedUrl}`);
    return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>En Vivo - L3HO</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    iframe{width:100%;height:100%;border:none;display:block}
  </style>
</head>
<body>
  <iframe src="${embedUrl}" allowfullscreen allow="autoplay; fullscreen" scrolling="no" referrerpolicy="no-referrer"></iframe>
</body>
</html>`);
  }

  try {
    // Paso 1: API de streamed.pk → obtener embedUrl
    const apiResp = await axios.get(`https://streamed.pk/api/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, {
      headers: { "User-Agent": UA, "Referer": "https://streamed.pk/", "Origin": "https://streamed.pk", "Accept": "application/json" },
      timeout: 12000
    });
    const streams = Array.isArray(apiResp.data) ? apiResp.data : [];
    if (streams.length === 0) return res.status(404).json({ error: "Stream no disponible para esta fuente" });

    const embedUrl = streams[0].embedUrl;
    if (!embedUrl) return res.status(502).json({ error: "La API no devolvió embedUrl" });

    // Paso 2: Fetch embedsports.top → detectar tipo de embed
    let embedHtml = "";
    try {
      const embedResp = await axios.get(embedUrl, {
        headers: { "User-Agent": UA, "Referer": "https://streamed.pk/" },
        timeout: 8000
      });
      embedHtml = typeof embedResp.data === "string" ? embedResp.data : JSON.stringify(embedResp.data);
    } catch (fetchErr) {
      // embedsports.top no respondió (TLS fingerprinting o timeout) → fallback iframe
      return serveIframePlayer(embedUrl, `fetch-error: ${fetchErr.message.split(":")[0]}`);
    }

    // Si usa bundle-jw.js (JW Player directo / delta, echo) → extraer m3u8 con Puppeteer
    if (embedHtml.includes("bundle-jw.js") && !embedHtml.includes("embedhd.org")) {
      console.log(`🤖 streamed-stream [${source}/${id}] → bundle-jw detectado, usando Puppeteer...`);
      try {
        const extracted = await extractM3u8FromEmbedSports(embedUrl);
        console.log(`🎬 streamed-stream [${source}/${id}] → Puppeteer OK: ${extracted.m3u8Url.substring(0, 80)}...`);
        return res.send(buildLivePlayer(extracted.m3u8Url, baseUrl));
      } catch (puppErr) {
        console.warn(`⚠️ streamed-stream Puppeteer falló (${puppErr.message.substring(0,60)}), usando iframe`);
        return serveIframePlayer(embedUrl, `puppet-fail`);
      }
    }

    // Paso 3: extraer iframe src de embedhd.org
    const iframeMatch = embedHtml.match(/iframe src="(https:\/\/embedhd\.org[^"]+)"/);
    if (!iframeMatch) {
      // Estructura desconocida → iframe fallback
      return serveIframePlayer(embedUrl, "unknown-embed-structure");
    }

    // Paso 4: Fetch embedhd.org → extraer fid
    const embedhdResp = await axios.get(iframeMatch[1], {
      headers: { "User-Agent": UA, "Referer": "https://embedsports.top/" },
      timeout: 10000
    });
    const embedhdHtml = typeof embedhdResp.data === "string" ? embedhdResp.data : JSON.stringify(embedhdResp.data);
    const fidMatch = embedhdHtml.match(/fid="([^"]+)"/);
    if (!fidMatch) return serveIframePlayer(embedUrl, "no-fid");
    const fid = fidMatch[1];

    // Paso 5: Fetch maestrohd1.php con fid → reconstruir URL m3u8 del array de chars
    const playerResp = await axios.get(`https://exposestrat.com/maestrohd1.php?player=desktop&live=${encodeURIComponent(fid)}`, {
      headers: { "User-Agent": UA, "Referer": "https://embedhd.org/" },
      timeout: 10000
    });
    const playerHtml = typeof playerResp.data === "string" ? playerResp.data : JSON.stringify(playerResp.data);

    // Reconstruir la URL m3u8 desde el array de chars ofuscado
    let m3u8Url = null;
    const arrayMatches = playerHtml.match(/\[(?:"[^"]{0,4}",?){20,}\]\.join\(""\)/g) || [];
    for (const arrayStr of arrayMatches) {
      try {
        const chars = (arrayStr.match(/"([^"]*)"/g) || []).map(s => s.slice(1, -1).replace(/\\\//g, "/"));
        const reconstructed = chars.join("");
        if (reconstructed.includes(".m3u8")) { m3u8Url = reconstructed; break; }
      } catch {}
    }

    // Fallback: channelId → construir URL base zohanayaan.com
    if (!m3u8Url) {
      const chMatch = playerHtml.match(/channelId\s*:\s*['"]([^'"]+)['"]/);
      if (chMatch) m3u8Url = `https://${chMatch[1]}.m3u8`;
    }

    // Si aun no hay m3u8 → iframe
    if (!m3u8Url) return serveIframePlayer(embedUrl, `no-m3u8/fid=${fid}`);

    console.log(`🎬 streamed-stream [${source}/${id}] → fid=${fid} → ${m3u8Url.substring(0, 80)}...`);
    return res.send(buildLivePlayer(m3u8Url, baseUrl));

  } catch (err) {
    console.error("❌ streamed-stream error:", err.message);
    return res.status(500).json({ error: "Error obteniendo stream: " + err.message });
  }
});

async function extractM3u8FromEmbedSports(pageUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const browser = await launchStealthBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-MX,es;q=0.9",
      "Referer": "https://streamed.pk/"
    });

    let m3u8Found = null;
    // strmd.top CDN requiere embedsports.top como referer para servir el stream
    const embedReferer = "https://embedsports.top/";

    // Interceptar tanto requests como responses para capturar el m3u8
    await page.setRequestInterception(true);
    page.on("request", req => {
      const u = req.url();
      if ((u.includes(".m3u8") || u.includes("manifest") || u.includes("/hls/")) && !m3u8Found) {
        m3u8Found = u;
      }
      req.continue();
    });
    page.on("response", async resp => {
      try {
        const u = resp.url();
        const ct = resp.headers()["content-type"] || "";
        if (!m3u8Found && (u.includes(".m3u8") || ct.includes("mpegurl") || ct.includes("x-mpegURL"))) {
          m3u8Found = u;
        }
      } catch {}
    });

    await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Intentar clic en el player para activar la reproducción
    try {
      await page.click("#player");
    } catch {}

    await new Promise(resolve => {
      const check = setInterval(() => { if (m3u8Found) { clearInterval(check); resolve(); } }, 300);
      setTimeout(() => { clearInterval(check); resolve(); }, 25000);
    });

    await page.close();
    if (!m3u8Found) throw new Error("No se detectó m3u8 en embedsports.top");
    console.log(`✅ embedsports m3u8: ${m3u8Found}`);
    return { m3u8Url: m3u8Found, referer: embedReferer };
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}


const YTDLP_PATHS = [
  "/home/runner/workspace/.pythonlibs/bin/yt-dlp",
  path.join(__dirname, "node_modules/yt-dlp-exec/bin/yt-dlp"),
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp"
];

function findYtDlp() {
  const fs = require("fs");
  return YTDLP_PATHS.find(p => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

async function extractFromYouTubeViaYtDlp(videoUrl) {
  const bin = findYtDlp();
  if (!bin) throw new Error("yt-dlp no disponible en este entorno");
  const { stdout } = await execFileAsync(bin, [
    videoUrl,
    "--dump-single-json",
    "--no-warnings",
    // Force web client (H.264/AAC, browser-compatible) instead of ANDROID_VR
    "--extractor-args", "youtube:player_client=android",
    // Prefer H.264 mp4 with audio — guaranteed to play in any browser
    "--format", "18/best[ext=mp4][vcodec^=avc1][acodec!=none]/best[ext=mp4][acodec!=none]/best",
    "--add-header", "referer:https://www.youtube.com/"
  ], { timeout: 30000 });
  const info = JSON.parse(stdout);
  if (!info) throw new Error("yt-dlp no devolvió información");
  const isLive = info.is_live || false;
  if (isLive && info.manifest_url) {
    return { type: "m3u8", url: info.manifest_url, referer: "https://www.youtube.com/", title: info.title };
  }
  if (isLive) {
    const hlsFmt = (info.formats || []).find(f => f.protocol === "m3u8" || f.protocol === "m3u8_native");
    if (hlsFmt) return { type: "m3u8", url: hlsFmt.url, referer: "https://www.youtube.com/", title: info.title };
  }
  if (!info.url) throw new Error("yt-dlp no encontró URL reproducible");
  return { type: "mp4", url: info.url, referer: "https://www.youtube.com/", title: info.title, mimeType: info.ext ? `video/${info.ext}` : "video/mp4" };
}

async function extractFromYouTube(videoUrl) {
  // Intento 1: play-dl — puro Node.js, funciona en Vercel y cualquier entorno
  try {
    const yt_validate = playDl.yt_validate(videoUrl);
    if (!yt_validate || yt_validate === "search") throw new Error("URL de YouTube inválida");
    const info = await playDl.video_info(videoUrl);
    const isLive = info.video_details?.live;
    if (isLive) {
      const hlsFmt = (info.format || []).find(f => f.mimeType?.includes("application/x-mpegURL") || f.url?.includes(".m3u8"));
      if (hlsFmt?.url) return { type: "m3u8", url: hlsFmt.url, referer: "https://www.youtube.com/", title: info.video_details?.title };
    }
    const formats = (info.format || []).filter(f => f.url);
    const best = formats.filter(f => f.mimeType?.includes("video/mp4")).sort((a, b) => (b.quality || 0) - (a.quality || 0))[0]
      || formats[0];
    if (!best?.url) throw new Error("No se encontró formato con URL directa");
    return { type: "mp4", url: best.url, referer: "https://www.youtube.com/", title: info.video_details?.title };
  } catch (playErr) {
    console.log(`⚠️ play-dl falló (${playErr.message}), intentando ytdl-core...`);
  }

  // Intento 2: @distube/ytdl-core — segunda opción pura Node.js
  try {
    if (!ytdl.validateURL(videoUrl)) throw new Error("URL de YouTube inválida");
    const info = await ytdl.getInfo(videoUrl);
    const isLive = info.videoDetails.isLiveContent;
    if (isLive) {
      const hlsFmt = info.formats.find(f => f.isHLS);
      if (hlsFmt) return { type: "m3u8", url: hlsFmt.url, referer: "https://www.youtube.com/", title: info.videoDetails.title };
    }
    const format = ytdl.chooseFormat(info.formats, { quality: "highestvideo", filter: "audioandvideo" })
      || ytdl.chooseFormat(info.formats, { filter: "audioandvideo" });
    if (!format?.url) throw new Error("No se encontró formato compatible");
    return { type: "mp4", url: format.url, referer: "https://www.youtube.com/", title: info.videoDetails.title };
  } catch (ytdlErr) {
    console.log(`⚠️ ytdl-core falló (${ytdlErr.message}), intentando yt-dlp...`);
  }

  // Intento 3: yt-dlp — más robusto, disponible en Replit/servidor propio
  return extractFromYouTubeViaYtDlp(videoUrl);
}

// Helpers reutilizables para Puppeteer en bolaloca
const PUPPETEER_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
  "--disable-gpu", "--no-first-run", "--disable-infobars", "--window-size=1280,720",
  "--disable-extensions", "--disable-background-networking", "--disable-sync",
  "--disable-translate", "--metrics-recording-only", "--mute-audio"
];

function findChromiumPath() {
  const fs = require("fs");
  const { execSync } = require("child_process");
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/nix/var/nix/profiles/default/bin/chromium",
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  try {
    const nixResult = execSync(
      "ls /nix/store/ | grep '^[a-z0-9]*-chromium-' | head -1",
      { timeout: 3000, encoding: "utf8" }
    ).trim();
    if (nixResult) {
      const nixPath = `/nix/store/${nixResult}/bin/chromium-browser`;
      if (fs.existsSync(nixPath)) return nixPath;
      const nixPath2 = `/nix/store/${nixResult}/bin/chromium`;
      if (fs.existsSync(nixPath2)) return nixPath2;
    }
  } catch {}
  return null;
}

// Caché de instancias Puppeteer (reutilizar browser entre peticiones)
let _sharedBrowser = null;
let _browserLastUsed = 0;
const BROWSER_IDLE_TTL = 5 * 60 * 1000; // cerrar si lleva 5 min sin uso

async function getSharedBrowser() {
  let puppeteerExtra, StealthPlugin;
  try {
    puppeteerExtra = require("puppeteer-extra");
    StealthPlugin = require("puppeteer-extra-plugin-stealth");
  } catch {
    throw new Error("Puppeteer no está disponible en este entorno");
  }
  if (!getSharedBrowser._registered) {
    puppeteerExtra.use(StealthPlugin());
    getSharedBrowser._registered = true;
  }
  if (_sharedBrowser) {
    try {
      await _sharedBrowser.pages();
      _browserLastUsed = Date.now();
      return _sharedBrowser;
    } catch {
      _sharedBrowser = null;
    }
  }
  const chromiumPath = findChromiumPath();
  if (!chromiumPath) throw new Error("Chromium no encontrado en este entorno");
  console.log(`🌐 Lanzando Puppeteer con: ${chromiumPath}`);
  _sharedBrowser = await puppeteerExtra.launch({
    headless: "new",
    executablePath: chromiumPath,
    args: PUPPETEER_ARGS
  });
  _browserLastUsed = Date.now();
  _sharedBrowser.on("disconnected", () => { _sharedBrowser = null; });
  return _sharedBrowser;
}

// Cerrar browser inactivo periódicamente
setInterval(async () => {
  if (_sharedBrowser && Date.now() - _browserLastUsed > BROWSER_IDLE_TTL) {
    console.log("🧹 Cerrando Puppeteer inactivo...");
    try { await _sharedBrowser.close(); } catch {}
    _sharedBrowser = null;
  }
}, 60 * 1000);

async function launchStealthBrowser() {
  return getSharedBrowser();
}
// yt-stream: yt-dlp pipes video directly to browser — avoids all CDN URL/IP issues
app.get("/yt-stream", (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).send("Falta ?url=");
  let decodedUrl;
  try { decodedUrl = decodeURIComponent(raw); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  const bin = findYtDlp();
  if (!bin) return res.status(503).send("yt-dlp no disponible");

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Accept-Ranges", "none");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const proc = spawn(bin, [
    decodedUrl,
    "--no-warnings",
    "--quiet",
    "--extractor-args", "youtube:player_client=android",
    "--format", "18/best[ext=mp4][acodec!=none][vcodec!=none]/best",
    "-o", "-"
  ]);

  proc.stdout.pipe(res);
  proc.stderr.on("data", (d) => console.error("yt-stream stderr:", d.toString().trim()));
  proc.on("error", (err) => { if (!res.headersSent) res.status(502).send("yt-stream error: " + err.message); });
  proc.on("close", (code) => { if (code !== 0) console.log("yt-stream exit:", code); });
  req.on("close", () => { try { proc.kill(); } catch {} });
});

app.get("/yt-proxy", async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).send("Falta ?url=");
  let targetUrl;
  try { targetUrl = decodeURIComponent(raw); new URL(targetUrl); }
  catch { return res.status(400).send("URL inválida"); }

  const range = req.headers.range;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com"
  };
  if (range) headers["Range"] = range;

  try {
    const upstream = await axios.get(targetUrl, {
      responseType: "stream",
      headers,
      timeout: 30000
    });
    res.status(upstream.status);
    const passthroughHeaders = ["content-type","content-length","content-range","accept-ranges","cache-control"];
    passthroughHeaders.forEach(h => { if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]); });
    res.setHeader("Access-Control-Allow-Origin", "*");
    upstream.data.pipe(res);
  } catch (e) {
    if (!res.headersSent) res.status(502).send("yt-proxy error: " + e.message);
  }
});

function buildDirectHlsPlayer(m3u8Src, baseUrl) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>En Vivo — L3HO</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    :root{--a:#f59e0b;--b:#f97316;--grad:linear-gradient(135deg,#f59e0b,#f97316);--glow:rgba(249,115,22,.45);--bg:#0a0805}
    html,body{width:100%;height:100%;background:var(--bg);overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;color:#fff}
    #wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
    video{width:100%;height:100%;object-fit:contain;display:block}
    #loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;z-index:20;gap:16px}
    .spin-ring{width:48px;height:48px;border-radius:50%;border:3px solid transparent;border-top-color:#f59e0b;border-right-color:#f97316;animation:spin .9s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loader p{font-size:12px;color:var(--a);letter-spacing:.8px;font-weight:600}
    #logo{position:absolute;top:10px;right:12px;z-index:10;pointer-events:none}
    #logo img{height:48px;opacity:.12;filter:drop-shadow(0 1px 4px rgba(0,0,0,.7))}
    #liveBadge{
      position:absolute;top:12px;left:12px;z-index:12;
      display:flex;align-items:center;gap:4px;
      padding:3px 8px;border-radius:20px;
      background:rgba(0,0,0,.72);border:1px solid rgba(245,158,11,.45);
      backdrop-filter:blur(10px);
      font-size:9.5px;font-weight:700;letter-spacing:1px;opacity:1;
      animation:badgeGlow 2.4s ease-in-out infinite;
    }
    @keyframes badgeGlow{
      0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0),0 0 6px rgba(245,158,11,.2)}
      50%{box-shadow:0 0 0 3px rgba(249,115,22,.18),0 0 10px rgba(245,158,11,.35)}
    }
    #liveDot{width:6px;height:6px;border-radius:50%;background:var(--grad);box-shadow:0 0 6px var(--glow);animation:dotPulse 1.8s ease-in-out infinite}
    @keyframes dotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.65)}}
    #controls{position:absolute;bottom:0;left:0;right:0;padding:0 14px 10px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s;z-index:10}
    #wrap:hover #controls,#wrap.showCtrl #controls{opacity:1}
    #btnRow{display:flex;align-items:center;gap:10px;margin-top:6px}
    .btn{background:none;border:none;color:rgba(255,255,255,.75);cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
    .btn:hover{background:rgba(255,255,255,.1)}
    .btn:active{background:rgba(245,158,11,.18)}
    .btn svg{width:20px;height:20px;fill:url(#iconGrad)}
    #spacer{flex:1}
    #errOverlay{position:absolute;inset:0;background:rgba(0,0,0,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:30;gap:14px;padding:24px;text-align:center}
    #errOverlay svg{width:52px;height:52px;fill:var(--a);opacity:.8}
    #errOverlay h2{font-size:18px}
    #errOverlay p{font-size:13px;color:rgba(255,255,255,.5);max-width:280px}
    #retryBtn{background:var(--grad);color:#fff;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s}
    #retryBtn:hover{opacity:.85}
  </style>
</head>
<body>
<svg width="0" height="0" style="position:absolute;overflow:hidden">
  <defs>
    <linearGradient id="iconGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
</svg>
<div id="wrap">
  <video id="video" playsinline></video>
  <div id="loader"><div class="spin-ring"></div><p>CONECTANDO...</p></div>
  <div id="logo"><img src="${baseUrl}/public/ultragol-logo.png" alt="L3HO"></div>
  <div id="liveBadge"><div id="liveDot"></div>EN VIVO</div>
  <div id="controls">
    <div id="btnRow">
      <button class="btn" id="btnPlay"><svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg></button>
      <button class="btn" id="btnMute"><svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg></button>
      <div id="spacer"></div>
      <button class="btn" id="btnFs"><svg viewBox="0 0 24 24" id="fsIcon"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
    </div>
  </div>
  <div id="errOverlay">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    <h2>Stream no disponible</h2>
    <p>El canal puede no estar transmitiendo en este momento.</p>
    <button id="retryBtn">&#8635; Reintentar</button>
  </div>
</div>
<script>
(function(){
  var SRC = ${JSON.stringify(m3u8Src)};
  var video=document.getElementById("video"),loader=document.getElementById("loader");
  var errOverlay=document.getElementById("errOverlay"),btnPlay=document.getElementById("btnPlay");
  var playIcon=document.getElementById("playIcon"),btnMute=document.getElementById("btnMute");
  var volIcon=document.getElementById("volIcon"),btnFs=document.getElementById("btnFs");
  var wrap=document.getElementById("wrap"),hlsInstance=null,retries=0,maxRetries=3,ctrlTimer;
  var ICONS={play:'<path d="M8 5v14l11-7z"/>',pause:'<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',volOn:'<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',volOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',fsOn:'<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',fsOff:'<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'};
  function setIcon(el,k){el.innerHTML=ICONS[k];}
  function showCtrl(){wrap.classList.add("showCtrl");clearTimeout(ctrlTimer);ctrlTimer=setTimeout(()=>wrap.classList.remove("showCtrl"),3000);}
  wrap.addEventListener("mousemove",showCtrl);
  wrap.addEventListener("touchstart",showCtrl,{passive:true});
  btnPlay.addEventListener("click",function(e){e.stopPropagation();video.paused?video.play():video.pause();});
  video.addEventListener("play",function(){setIcon(playIcon,"pause");});
  video.addEventListener("pause",function(){setIcon(playIcon,"play");});
  btnMute.addEventListener("click",function(){video.muted=!video.muted;setIcon(volIcon,video.muted?"volOff":"volOn");});
  btnFs.addEventListener("click",function(){
    var el=document.documentElement;
    if(!document.fullscreenElement&&!document.webkitFullscreenElement){(el.requestFullscreen||el.webkitRequestFullscreen).call(el);setIcon(document.getElementById("fsIcon"),"fsOff");}
    else{(document.exitFullscreen||document.webkitExitFullscreen).call(document);setIcon(document.getElementById("fsIcon"),"fsOn");}
  });
  function initPlayer(){
    loader.style.display="flex";loader.querySelector("p").textContent=retries>0?"Reintentando... ("+retries+"/"+maxRetries+")":"Conectando al stream...";
    errOverlay.style.display="none";
    if(hlsInstance){hlsInstance.destroy();hlsInstance=null;}
    if(Hls.isSupported()){
      var hls=new Hls({maxBufferLength:20,liveSyncDurationCount:3,manifestLoadingMaxRetry:2,levelLoadingMaxRetry:2,enableWorker:true});
      hlsInstance=hls;
      hls.loadSource(SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,function(){loader.style.display="none";video.play().catch(function(){});retries=0;});
      hls.on(Hls.Events.ERROR,function(e,data){
        if(data.fatal){hls.destroy();hlsInstance=null;
          if(retries<maxRetries){retries++;loader.style.display="flex";setTimeout(initPlayer,3000);}
          else{errOverlay.style.display="flex";loader.style.display="none";}}
      });
    } else if(video.canPlayType("application/vnd.apple.mpegurl")){
      video.src=SRC;
      video.addEventListener("loadedmetadata",function(){loader.style.display="none";video.play().catch(function(){});});
      video.addEventListener("error",function(){if(retries<maxRetries){retries++;setTimeout(initPlayer,3000);}else{errOverlay.style.display="flex";loader.style.display="none";}});
    } else {errOverlay.style.display="flex";loader.style.display="none";}
  }
  document.getElementById("retryBtn").addEventListener("click",function(){retries=0;initPlayer();});
  initPlayer();
})();
</script>
</body>
</html>`;
}

function buildLivePlayer(m3u8Src, baseUrl) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>En Vivo — L3HO</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}

    :root{
      --a:#f59e0b;
      --b:#f97316;
      --grad:linear-gradient(135deg,#f59e0b,#f97316);
      --grad-r:linear-gradient(135deg,#f97316,#f59e0b);
      --glow:rgba(249,115,22,.45);
      --glass:rgba(0,0,0,.45);
      --glass-border:rgba(255,255,255,.12);
      --bg:#0a0805;
    }

    html{
      width:100%;
      height:100%;
      height:-webkit-fill-available;
    }
    body{
      width:100%;
      height:100%;
      height:100dvh;
      min-height:-webkit-fill-available;
      background:var(--bg);
      overflow:hidden;
      font-family:'Inter',system-ui,sans-serif;
      color:#fff;
    }

    /* ── Fondo con halo de color ── */
    #wrap{
      position:relative;width:100%;height:100%;
      display:flex;align-items:center;justify-content:center;
      background:#000;
    }
    #wrap::before{
      content:'';position:absolute;inset:0;
      background:radial-gradient(ellipse 60% 40% at 50% 100%, rgba(249,115,22,.18) 0%, transparent 70%);
      pointer-events:none;z-index:1;
    }

    video{width:100%;height:100%;object-fit:contain;display:block;position:relative;z-index:0}

    /* ── Loader glass ── */
    #loader{
      position:absolute;inset:0;z-index:25;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:20px;
      background:rgba(0,0,0,.88);
      backdrop-filter:blur(6px);
    }
    .spin-ring{
      width:60px;height:60px;position:relative;
    }
    .spin-ring::before,.spin-ring::after{
      content:'';position:absolute;inset:0;border-radius:50%;
    }
    .spin-ring::before{
      border:3px solid rgba(255,255,255,.08);
    }
    .spin-ring::after{
      border:3px solid transparent;
      border-top-color:var(--a);
      border-right-color:var(--b);
      animation:spin .9s cubic-bezier(.6,.2,.4,.8) infinite;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    #loaderText{
      font-size:13px;font-weight:500;letter-spacing:.8px;
      background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
    }
    #loaderDots::after{content:'';animation:dots 1.4s steps(4,end) infinite}
    @keyframes dots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}100%{content:''}}

    /* ── Logo ── */
    #logo{
      position:absolute;top:14px;right:14px;z-index:12;
      pointer-events:none;transition:opacity .5s;
    }
    #logo img{height:52px;width:auto;opacity:.15;filter:drop-shadow(0 2px 8px rgba(0,0,0,.8));transition:opacity .5s}
    #wrap:hover #logo img,#wrap.showCtrl #logo img{opacity:.06}

    /* ── Badge LIVE ── */
    #liveBadge{
      position:absolute;top:12px;left:12px;z-index:12;
      display:flex;align-items:center;gap:4px;
      padding:3px 8px;border-radius:20px;
      background:rgba(0,0,0,.72);
      border:1px solid rgba(245,158,11,.45);
      backdrop-filter:blur(10px);
      font-size:9.5px;font-weight:700;letter-spacing:1px;
      opacity:1;
      animation:badgeGlow 2.4s ease-in-out infinite;
    }
    @keyframes badgeGlow{
      0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0),0 0 6px rgba(245,158,11,.2)}
      50%{box-shadow:0 0 0 3px rgba(249,115,22,.18),0 0 10px rgba(245,158,11,.35)}
    }
    #liveDot{
      width:6px;height:6px;border-radius:50%;
      background:var(--grad);
      box-shadow:0 0 6px var(--glow);
      animation:pulse 1.8s ease-in-out infinite;
    }
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.65)}}

    /* ── Zona doble-tap izq/der ── */
    .tapZone{
      position:absolute;top:0;bottom:0;width:30%;z-index:4;
      display:flex;align-items:center;justify-content:center;
    }
    #tapLeft{left:0}
    #tapRight{right:0}
    .tapRipple{
      width:80px;height:80px;border-radius:50%;
      background:rgba(245,158,11,.2);border:2px solid rgba(245,158,11,.4);
      display:flex;align-items:center;justify-content:center;
      opacity:0;transform:scale(.3);
      transition:opacity .22s,transform .22s;
      backdrop-filter:blur(4px);
      pointer-events:none;
    }
    .tapRipple.show{opacity:1;transform:scale(1)}
    .tapRipple svg{width:28px;height:28px;fill:var(--a)}
    .tapRipple span{
      position:absolute;bottom:-22px;
      font-size:11px;font-weight:600;color:var(--a);
      white-space:nowrap;
    }

    /* ── Tap center (play/pause) ── */
    #tapCenter{
      position:absolute;inset:0;z-index:3;
      display:flex;align-items:center;justify-content:center;
      pointer-events:none;
    }
    .tapCircle{
      width:72px;height:72px;border-radius:50%;
      background:rgba(0,0,0,.5);border:2px solid rgba(245,158,11,.5);
      display:flex;align-items:center;justify-content:center;
      opacity:0;transform:scale(.4);
      transition:opacity .2s,transform .2s;
      backdrop-filter:blur(8px);
      box-shadow:0 0 20px var(--glow);
    }
    .tapCircle.show{opacity:1;transform:scale(1)}
    .tapCircle svg{width:30px;height:30px;fill:var(--a)}

    /* ── Panel de controles glass ── */
    #controls{
      position:absolute;bottom:0;left:0;right:0;z-index:10;
      padding:0 16px 14px;
      background:linear-gradient(transparent,rgba(0,0,0,.75) 40%,rgba(0,0,0,.92));
      opacity:0;transition:opacity .3s;
    }
    #wrap:hover #controls,#wrap.showCtrl #controls{opacity:1}

    /* ── Barra de progreso ── */
    #progressWrap{
      position:relative;height:22px;cursor:pointer;
      display:flex;align-items:center;margin-bottom:6px;
    }
    #progressTrack{
      position:absolute;left:0;right:0;height:3px;
      background:rgba(255,255,255,.15);border-radius:99px;
      transition:height .15s;overflow:hidden;
    }
    #progressWrap:hover #progressTrack{height:5px}
    #liveBar{
      position:absolute;inset:0;
      background:linear-gradient(90deg,rgba(245,158,11,.5),rgba(249,115,22,.2));
      border-radius:99px;
    }
    #progressFill{
      position:absolute;left:0;top:0;bottom:0;width:0%;
      background:var(--grad);border-radius:99px;
    }
    #progressThumb{
      position:absolute;width:14px;height:14px;
      background:#fff;border-radius:50%;
      top:50%;left:0;transform:translateY(-50%) scale(0);
      transition:transform .15s;
      box-shadow:0 0 0 3px rgba(245,158,11,.4),0 2px 6px rgba(0,0,0,.6);
    }
    #progressWrap:hover #progressThumb{transform:translateY(-50%) scale(1)}

    /* ── Fila de botones ── */
    #btnRow{display:flex;align-items:center;gap:4px}

    .btn{
      background:none;border:none;color:rgba(255,255,255,.85);
      cursor:pointer;padding:7px;border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      transition:color .15s,background .15s;
      position:relative;
    }
    .btn:hover{color:#fff;background:rgba(255,255,255,.1)}
    .btn:active{background:rgba(245,158,11,.18)}
    .btn svg{width:20px;height:20px;fill:url(#iconGrad)}

    /* botón play más grande */
    #btnPlay{padding:8px}
    #btnPlay svg{width:24px;height:24px;fill:url(#iconGrad)}

    /* ── Volumen popup ── */
    #volWrap{position:relative}
    #volPanel{
      position:absolute;bottom:calc(100% + 14px);left:50%;
      transform:translateX(-50%) translateY(8px) scale(.9);
      transform-origin:bottom center;
      width:42px;padding:12px 0 10px;
      background:rgba(8,6,3,.94);
      border:1px solid rgba(245,158,11,.22);
      border-radius:21px;
      backdrop-filter:blur(22px);
      box-shadow:0 12px 40px rgba(0,0,0,.75),0 0 0 1px rgba(245,158,11,.07),inset 0 1px 0 rgba(255,255,255,.06);
      display:flex;flex-direction:column;align-items:center;gap:8px;
      opacity:0;pointer-events:none;
      transition:opacity .22s,transform .22s;
      z-index:20;
    }
    #volPanel.open{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0) scale(1)}
    #volPct{
      font-size:10px;font-weight:800;letter-spacing:.4px;
      background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
      min-height:13px;line-height:1;
    }
    #volTrack{
      position:relative;width:4px;height:88px;
      background:rgba(255,255,255,.08);border-radius:99px;
      overflow:visible;
    }
    #volFill{
      position:absolute;bottom:0;left:0;right:0;border-radius:99px;
      background:linear-gradient(to top,var(--b),var(--a));
      box-shadow:0 0 12px rgba(249,115,22,.55);
      transition:height .07s linear;
    }
    #volThumb{
      position:absolute;left:50%;transform:translateX(-50%);
      width:13px;height:13px;border-radius:50%;
      background:#fff;
      box-shadow:0 0 0 2px rgba(245,158,11,.7),0 2px 8px rgba(0,0,0,.6);
      transition:bottom .07s linear;
      pointer-events:none;z-index:2;
    }
    #volSlider{
      position:absolute;inset:-6px;opacity:0;cursor:pointer;
      writing-mode:vertical-lr;direction:rtl;
      width:calc(100% + 12px);height:calc(100% + 12px);
      touch-action:none;
    }
    #volIcon8{
      width:14px;height:14px;fill:url(#iconGradFade);flex-shrink:0;
    }

    #spacer{flex:1}

    /* ── Overlay de error glass ── */
    #errOverlay{
      position:absolute;inset:0;z-index:30;
      display:none;flex-direction:column;align-items:center;justify-content:center;
      gap:16px;padding:32px;text-align:center;
      background:rgba(0,0,0,.85);
      backdrop-filter:blur(12px);
    }
    #errIcon{
      width:64px;height:64px;border-radius:50%;
      background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.3);
      display:flex;align-items:center;justify-content:center;
    }
    #errIcon svg{width:32px;height:32px;fill:var(--b)}
    #errOverlay h2{font-size:18px;font-weight:700;color:#fff}
    #errOverlay p{font-size:13px;color:rgba(255,255,255,.45);max-width:260px;line-height:1.6}
    #retryBtn{
      background:var(--grad);color:#000;border:none;
      padding:12px 32px;border-radius:999px;
      font-size:14px;font-weight:700;cursor:pointer;
      letter-spacing:.3px;transition:opacity .2s,transform .15s;
      box-shadow:0 4px 16px var(--glow);
    }
    #retryBtn:hover{opacity:.88;transform:translateY(-1px)}
    #retryBtn:active{transform:translateY(0)}

    /* toast removed */

    /* ── Buffer overlay ── */
    #bufferSpinner{
      position:absolute;inset:0;z-index:8;
      display:none;align-items:center;justify-content:center;
      pointer-events:none;
    }
    .bufRing{
      width:48px;height:48px;border-radius:50%;
      border:3px solid rgba(255,255,255,.08);
      border-top-color:var(--a);
      animation:spin .7s linear infinite;
    }

    /* ── Bitrate badge ── */
    #bitrateBadge{
      position:absolute;bottom:70px;right:14px;z-index:12;
      padding:4px 9px;border-radius:20px;
      background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1);
      backdrop-filter:blur(10px);
      font-size:10px;font-weight:600;color:rgba(255,255,255,.55);
      pointer-events:none;opacity:0;transition:opacity .3s;
      letter-spacing:.4px;
    }
    #wrap:hover #bitrateBadge,#wrap.showCtrl #bitrateBadge{opacity:1}

    /* ── Botón cast ── */
    #btnCast svg{width:18px;height:18px}
    #btnCast.casting{color:var(--a)}

    /* ── Zoom + pan ── */
    video{transform-origin:center center;will-change:transform;touch-action:none}
    #wrap{overflow:hidden;touch-action:none}
    #btnZoom.zoomed{color:var(--a)}
    #zoomBadge{
      position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:13;
      padding:4px 12px;border-radius:999px;
      background:rgba(0,0,0,.6);border:1px solid rgba(245,158,11,.35);
      backdrop-filter:blur(12px);
      font-size:11px;font-weight:700;color:var(--a);letter-spacing:.6px;
      pointer-events:none;opacity:0;
      transition:opacity .25s,transform .25s;
      transform:translateX(-50%) translateY(-8px);
    }
    #zoomBadge.show{opacity:1;transform:translateX(-50%) translateY(0)}
  </style>
</head>
<body>
<!-- SVG gradient defs for icon fills -->
<svg width="0" height="0" style="position:absolute;overflow:hidden">
  <defs>
    <linearGradient id="iconGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <linearGradient id="iconGradFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity=".35"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity=".35"/>
    </linearGradient>
  </defs>
</svg>
<div id="wrap">
  <video id="video" playsinline></video>

  <!-- Halo glow -->
  <div id="loader">
    <div class="spin-ring"></div>
    <div id="loaderText">CONECTANDO<span id="loaderDots"></span></div>
  </div>

  <div id="bufferSpinner"><div class="bufRing"></div></div>

  <div id="logo"><img src="${baseUrl}/public/ultragol-logo.png" alt="L3HO"></div>

  <div id="liveBadge"><div id="liveDot"></div>EN VIVO</div>

  <!-- Doble tap izquierda -->
  <div class="tapZone" id="tapLeft">
    <div class="tapRipple" id="rippleLeft">
      <svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
      <span id="seekLeftLabel">-10s</span>
    </div>
  </div>

  <!-- Tap centro play/pause -->
  <div id="tapCenter">
    <div class="tapCircle" id="tapCircle">
      <svg viewBox="0 0 24 24" id="tapIcon"><path d="M8 5v14l11-7z"/></svg>
    </div>
  </div>

  <!-- Doble tap derecha -->
  <div class="tapZone" id="tapRight">
    <div class="tapRipple" id="rippleRight">
      <svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
      <span id="seekRightLabel">+10s</span>
    </div>
  </div>

  <!-- Controles -->
  <div id="controls">
    <div id="progressWrap">
      <div id="progressTrack">
        <div id="liveBar"></div>
        <div id="progressFill"></div>
      </div>
      <div id="progressThumb"></div>
    </div>
    <div id="btnRow">
      <button class="btn" id="btnPlay" title="Play/Pausa (Espacio)">
        <svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div id="volWrap">
        <button class="btn" id="btnMute" title="Volumen (M)">
          <svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg>
        </button>
        <div id="volPanel">
          <span id="volPct">100%</span>
          <div id="volTrack">
            <div id="volFill" style="height:100%"></div>
            <div id="volThumb" style="bottom:calc(100% - 6px)"></div>
            <input type="range" id="volSlider" min="0" max="100" step="1" value="100">
          </div>
          <svg id="volIcon8" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
        </div>
      </div>
      <div id="spacer"></div>
      <button class="btn" id="btnZoom" title="Zoom (Z)">
        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg>
      </button>
      <button class="btn" id="btnPip" title="Ventana flotante" style="display:none">
        <svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>
      </button>
      <button class="btn" id="btnCast" title="Transmitir en pantalla" style="display:none">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5c-1.1 0-2 .9-2 2v3h2v-3h14v10h-5v2h5c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-18 3v2c4.97 0 9 4.03 9 9h2c0-6.08-4.92-11-11-11z"/></svg>
      </button>
      <button class="btn" id="btnFs" title="Pantalla completa (F)">
        <svg viewBox="0 0 24 24" id="fsIcon"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
      </button>
    </div>
  </div>

  <div id="bitrateBadge"></div>
  <div id="zoomBadge">🔍 1×</div>

  <!-- Error -->
  <div id="errOverlay">
    <div id="errIcon"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div>
    <h2>Stream no disponible</h2>
    <p>El canal puede estar fuera de línea o la señal expiró. Verifica tu conexión e intenta de nuevo.</p>
    <button id="retryBtn">&#8635;&nbsp; Reconectar</button>
  </div>
</div>

<script>
(function(){
  var M3U8        = ${JSON.stringify(m3u8Src)};
  var video       = document.getElementById('video');
  var loader      = document.getElementById('loader');
  var bufSpin     = document.getElementById('bufferSpinner');
  var errOverlay  = document.getElementById('errOverlay');
  var playIcon    = document.getElementById('playIcon');
  var tapIcon     = document.getElementById('tapIcon');
  var volIcon     = document.getElementById('volIcon');
  var volSlider   = document.getElementById('volSlider');
  var volPct      = document.getElementById('volPct');
  var progressFill  = document.getElementById('progressFill');
  var progressThumb = document.getElementById('progressThumb');
  var progressWrap  = document.getElementById('progressWrap');
  var liveBar     = document.getElementById('liveBar');
  var btnFs       = document.getElementById('btnFs');
  var btnPip      = document.getElementById('btnPip');
  var wrap        = document.getElementById('wrap');
  var tapCircle   = document.getElementById('tapCircle');
  var rippleLeft  = document.getElementById('rippleLeft');
  var rippleRight = document.getElementById('rippleRight');
  var ctrlTimer;
  var hls, hlsLevels = [], currentLevel = -1;
  var isLive = true;

  var ICONS = {
    play:  '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    volOn: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',
    volOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    fsOn:  '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    fsOff: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
  };
  function si(el,k){ el.innerHTML = ICONS[k]; }

  function showToast(){}

  /* ── Mostrar controles ── */
  function showCtrl(){
    wrap.classList.add('showCtrl');
    clearTimeout(ctrlTimer);
    ctrlTimer = setTimeout(function(){ wrap.classList.remove('showCtrl'); }, 3200);
  }
  wrap.addEventListener('mousemove', showCtrl);
  wrap.addEventListener('touchstart', showCtrl, {passive:true});

  /* ── Play / Pause ── */
  function doPlay(){ video.play().catch(function(){}); }
  function doPause(){ video.pause(); }
  function togglePlay(){
    if(video.paused){ doPlay(); } else { doPause(); }
    tapCircle.classList.add('show');
    clearTimeout(togglePlay._t);
    togglePlay._t = setTimeout(function(){ tapCircle.classList.remove('show'); }, 650);
  }
  document.getElementById('btnPlay').addEventListener('click', function(e){ e.stopPropagation(); togglePlay(); });
  video.addEventListener('play',  function(){ si(playIcon,'pause'); si(tapIcon,'pause'); });
  video.addEventListener('pause', function(){ si(playIcon,'play');  si(tapIcon,'play'); });

  /* ── Doble tap izq/der para adelantar/atrasar 10s ── */
  var tapCount = {l:0,r:0}, tapTimer = {l:null,r:null};
  function handleTap(side){
    var count = (tapCount[side] = (tapCount[side]||0)+1);
    var ripple = side==='l' ? rippleLeft : rippleRight;
    clearTimeout(tapTimer[side]);
    tapTimer[side] = setTimeout(function(){
      if(count >= 2){
        var delta = side==='l' ? -10 : 10;
        if(!isLive && video.duration){ video.currentTime = Math.max(0,Math.min(video.currentTime+delta,video.duration)); }
        ripple.classList.add('show');
        setTimeout(function(){ ripple.classList.remove('show'); }, 500);
        showToast(side==='l' ? '-10s' : '+10s');
      } else {
        togglePlay();
      }
      tapCount[side]=0;
    }, 260);
  }
  document.getElementById('tapLeft').addEventListener('click', function(e){
    if(e.target.closest('.btn')) return;
    handleTap('l');
  });
  document.getElementById('tapRight').addEventListener('click', function(e){
    if(e.target.closest('.btn')) return;
    handleTap('r');
  });

  /* ── Volumen popup ── */
  var volPanel  = document.getElementById('volPanel');
  var volFill   = document.getElementById('volFill');
  var volThumb  = document.getElementById('volThumb');
  var volPct    = document.getElementById('volPct');
  var volSlider = document.getElementById('volSlider');
  var volPanelTimer;

  function updateVolUI(){
    var pct = video.muted ? 0 : Math.round(video.volume * 100);
    volSlider.value = pct;
    volPct.textContent = pct + '%';
    volFill.style.height  = pct + '%';
    volThumb.style.bottom = 'calc(' + pct + '% - 6px)';
    si(volIcon, video.muted || pct === 0 ? 'volOff' : 'volOn');
  }

  function openVolPanel(){
    volPanel.classList.add('open');
    clearTimeout(volPanelTimer);
    volPanelTimer = setTimeout(closeVolPanel, 3000);
  }
  function closeVolPanel(){ volPanel.classList.remove('open'); }

  document.getElementById('btnMute').addEventListener('click', function(e){
    e.stopPropagation();
    if(!volPanel.classList.contains('open')){
      openVolPanel();
    } else {
      video.muted = !video.muted;
      updateVolUI();
      clearTimeout(volPanelTimer);
      volPanelTimer = setTimeout(closeVolPanel, 1800);
    }
  });

  volSlider.addEventListener('input', function(){
    var v = +this.value / 100;
    video.volume = v; video.muted = v === 0;
    updateVolUI();
    clearTimeout(volPanelTimer);
    volPanelTimer = setTimeout(closeVolPanel, 2500);
  });
  volSlider.addEventListener('touchstart', function(){ clearTimeout(volPanelTimer); }, {passive:true});

  /* Close panel when tapping outside */
  wrap.addEventListener('click', function(e){
    if(!e.target.closest('#volWrap')) closeVolPanel();
  });

  /* ── Progreso ── */
  progressWrap.addEventListener('click', function(e){
    if(isLive || !video.duration) return;
    var r = this.getBoundingClientRect();
    video.currentTime = ((e.clientX-r.left)/r.width)*video.duration;
  });
  video.addEventListener('timeupdate', function(){
    if(isLive || !video.duration) return;
    var pct = (video.currentTime/video.duration)*100;
    progressFill.style.width = pct+'%';
    progressThumb.style.left = pct+'%';
  });

  /* ── Fullscreen ── */
  btnFs.addEventListener('click', function(){
    var el = document.documentElement;
    if(!document.fullscreenElement && !document.webkitFullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen).call(el);
      si(document.getElementById('fsIcon'),'fsOff');
      showToast('⛶ Pantalla completa');
    } else {
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      si(document.getElementById('fsIcon'),'fsOn');
    }
  });

  /* ── PiP ── */
  if(document.pictureInPictureEnabled){
    btnPip.style.display='flex';
    btnPip.addEventListener('click', function(){
      if(document.pictureInPictureElement){ document.exitPictureInPicture().catch(function(){}); showToast('Ventana flotante: off'); }
      else { video.requestPictureInPicture().catch(function(){}); showToast('Ventana flotante: on'); }
    });
  }

  /* ── Zoom + pinch-to-zoom + pan ── */
  var zoomLevels = [1, 1.25, 1.5, 1.75, 2];
  var zoomIdx = 0;
  var curScale = 1, panX = 0, panY = 0;
  var btnZoom = document.getElementById('btnZoom');
  var zoomBadge = document.getElementById('zoomBadge');
  var zoomBadgeTimer;

  function clampPan(){
    var maxX = (curScale - 1) * wrap.clientWidth  / 2;
    var maxY = (curScale - 1) * wrap.clientHeight / 2;
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function applyTransform(animated){
    if(animated){ video.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'; }
    else { video.style.transition = 'none'; }
    if(curScale <= 1){
      curScale = 1; panX = 0; panY = 0;
      video.style.transform = '';
    } else {
      clampPan();
      video.style.transform = 'translate('+panX+'px,'+panY+'px) scale('+curScale+')';
    }
    btnZoom.classList.toggle('zoomed', curScale > 1);
  }

  function showZoomBadge(scale){
    var s = Math.round(scale * 100) / 100;
    var label = s <= 1 ? '🔍 Normal' : '🔍 ' + s + '×';
    zoomBadge.textContent = label;
    zoomBadge.classList.add('show');
    clearTimeout(zoomBadgeTimer);
    zoomBadgeTimer = setTimeout(function(){ zoomBadge.classList.remove('show'); }, 1600);
  }

  /* Button cycles preset levels */
  btnZoom.addEventListener('click', function(e){
    e.stopPropagation();
    zoomIdx = (zoomIdx + 1) % zoomLevels.length;
    curScale = zoomLevels[zoomIdx];
    panX = 0; panY = 0;
    applyTransform(true);
    showZoomBadge(curScale);
  });

  /* ── Pinch-to-zoom + one-finger pan ── */
  var pinchStartDist = 0, pinchStartScale = 1;
  var panStartX = 0, panStartY = 0, panStartTX = 0, panStartTY = 0;
  var isPinching = false, isPanning = false;

  function touchDist(t){ var dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }

  wrap.addEventListener('touchstart', function(e){
    if(e.touches.length === 2){
      isPinching = true; isPanning = false;
      pinchStartDist  = touchDist(e.touches);
      pinchStartScale = curScale;
    } else if(e.touches.length === 1 && curScale > 1){
      isPanning = true; isPinching = false;
      panStartX  = panX; panStartY  = panY;
      panStartTX = e.touches[0].clientX;
      panStartTY = e.touches[0].clientY;
    }
  }, {passive:true});

  wrap.addEventListener('touchmove', function(e){
    if(isPinching && e.touches.length === 2){
      e.preventDefault();
      var dist = touchDist(e.touches);
      curScale = Math.max(1, Math.min(3, pinchStartScale * dist / pinchStartDist));
      /* Sync zoomIdx to nearest preset */
      var ni = 0;
      zoomLevels.forEach(function(l,i){ if(Math.abs(l-curScale)<Math.abs(zoomLevels[ni]-curScale)) ni=i; });
      zoomIdx = ni;
      applyTransform(false);
    } else if(isPanning && e.touches.length === 1 && curScale > 1){
      e.preventDefault();
      panX = panStartX + (e.touches[0].clientX - panStartTX);
      panY = panStartY + (e.touches[0].clientY - panStartTY);
      applyTransform(false);
    }
  }, {passive:false});

  wrap.addEventListener('touchend', function(e){
    if(e.touches.length < 2) isPinching = false;
    if(e.touches.length === 0){
      isPanning = false;
      /* Snap back to 1× if barely zoomed */
      if(curScale < 1.08){ curScale = 1; panX = 0; panY = 0; zoomIdx = 0; applyTransform(true); }
      showZoomBadge(curScale);
    }
  }, {passive:true});


  /* ── Teclado ── */
  document.addEventListener('keydown', function(e){
    if(e.target.tagName==='INPUT') return;
    if(e.code==='Space'||e.key===' '){ e.preventDefault(); togglePlay(); }
    else if(e.key==='f'||e.key==='F'){ btnFs.click(); }
    else if(e.key==='z'||e.key==='Z'){ btnZoom.click(); }
    else if(e.key==='m'||e.key==='M'){ document.getElementById('btnMute').click(); }
    else if(e.key==='ArrowRight' && !isLive){ video.currentTime=Math.min(video.currentTime+10,video.duration||0); showToast('+10s'); }
    else if(e.key==='ArrowLeft'  && !isLive){ video.currentTime=Math.max(video.currentTime-10,0); showToast('-10s'); }
    else if(e.key==='ArrowUp'){   e.preventDefault(); video.volume=Math.min(1,video.volume+.1); video.muted=false; updateVolUI(); showToast(Math.round(video.volume*100)+'%'); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); video.volume=Math.max(0,video.volume-.1); updateVolUI(); showToast(Math.round(video.volume*100)+'%'); }
  });

  /* ── Buffer ── */
  video.addEventListener('waiting',  function(){ bufSpin.style.display='flex'; });
  video.addEventListener('playing',  function(){ bufSpin.style.display='none'; loader.style.display='none'; });
  video.addEventListener('canplay',  function(){ loader.style.display='none'; });

  /* ── Auto-reconexión inteligente ── */
  var reconnectTimer, reconnectAttempts = 0, maxReconnects = 10;
  function scheduleReconnect(){
    if(reconnectAttempts >= maxReconnects){ showToast('❌ Sin señal'); return; }
    reconnectAttempts++;
    var wait = Math.min(5000 * reconnectAttempts, 30000);
    showToast('🔄 Reintentando en ' + Math.round(wait/1000) + 's... (' + reconnectAttempts + '/' + maxReconnects + ')');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(function(){ initPlayer(); }, wait);
  }

  /* ── Bloqueo landscape en pantalla completa ── */
  document.addEventListener('fullscreenchange', function(){
    if(document.fullscreenElement){
      try{ screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(function(){}); }catch(e){}
    } else {
      try{ screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); }catch(e){}
    }
  });

  /* ── Bitrate / calidad de red ── */
  var bitrateBadge = document.getElementById('bitrateBadge');
  setInterval(function(){
    if(!hls) return;
    var lvl = hls.levels && hls.levels[hls.currentLevel];
    if(lvl && lvl.bitrate){
      var kbps = Math.round(lvl.bitrate / 1000);
      var label = kbps >= 1000 ? (kbps/1000).toFixed(1)+' Mbps' : kbps+' kbps';
      var dot = kbps >= 3000 ? '🟢' : kbps >= 1000 ? '🟡' : '🔴';
      bitrateBadge.textContent = dot + ' ' + label;
    }
  }, 2000);

  /* ── Botón Cast (Remote Playback API) ── */
  var btnCast = document.getElementById('btnCast');
  if(video.remote){
    video.remote.watchAvailability(function(available){
      btnCast.style.display = available ? 'flex' : 'none';
    }).catch(function(){ btnCast.style.display = 'flex'; });
    btnCast.addEventListener('click', function(e){
      e.stopPropagation();
      video.remote.prompt().then(function(){
        btnCast.classList.add('casting');
        showToast('📺 Transmitiendo en pantalla');
      }).catch(function(err){
        if(err.name !== 'NotAllowedError'){ showToast('Sin pantallas disponibles'); }
      });
    });
    video.remote.addEventListener('connecting', function(){ btnCast.classList.add('casting'); showToast('📺 Conectando...'); });
    video.remote.addEventListener('connect',    function(){ btnCast.classList.add('casting'); showToast('📺 Transmitiendo'); });
    video.remote.addEventListener('disconnect', function(){ btnCast.classList.remove('casting'); showToast('📺 Transmisión finalizada'); });
  }

  /* ── Inicializar HLS con reconexión integrada ── */
  function initPlayer(){
    clearTimeout(reconnectTimer);
    errOverlay.style.display='none';
    loader.style.display='flex';
    liveBar.style.display='block';
    progressFill.style.width='0%';
    if(hls){ hls.destroy(); hls=null; }
    if(Hls.isSupported()){
      hls = new Hls({ enableWorker:true, lowLatencyMode:true, xhrSetup:function(xhr){ xhr.withCredentials=false; } });
      hls.loadSource(M3U8);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function(e,data){
        hlsLevels = data.levels || [];
        isLive = video.duration === Infinity || !video.duration;
        if(!isLive){ liveBar.style.display='none'; }
        loader.style.display='none'; reconnectAttempts=0; doPlay();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, function(e,data){
        currentLevel=data.level;
      });
      hls.on(Hls.Events.ERROR, function(e,data){
        if(data.fatal){ loader.style.display='none'; errOverlay.style.display='flex'; scheduleReconnect(); }
      });
    } else if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=M3U8;
      video.addEventListener('loadedmetadata',function(){ loader.style.display='none'; doPlay(); });
      video.addEventListener('error',function(){ loader.style.display='none'; errOverlay.style.display='flex'; scheduleReconnect(); });
    } else { loader.style.display='none'; errOverlay.style.display='flex'; }
  }

  document.getElementById('retryBtn').addEventListener('click', function(){ reconnectAttempts=0; showToast('🔄 Reconectando...'); initPlayer(); });
  initPlayer();
})();
</script>
</body>
</html>`;
}

// Live relay for tvtvhd/fubohd streams — re-fetches a fresh token on every playlist request
app.get("/tvtvhd-relay", async (req, res) => {
  const pageUrl = req.query.page;
  if (!pageUrl) return res.status(400).send("Falta ?page=");
  let decodedPage;
  try { decodedPage = decodeURIComponent(pageUrl); new URL(decodedPage); }
  catch { return res.status(400).send("URL inválida"); }

  const h = new URL(decodedPage).hostname;
  if (!["tvtvhd.com", "ftvhd.com"].some(d => h === d || h.endsWith("." + d))) {
    return res.status(403).send("Dominio no permitido");
  }

  try {
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // Step 1: fetch tvtvhd page
    const pageResp = await axios.get(decodedPage, {
      timeout: 12000,
      headers: { "User-Agent": UA, "Referer": "https://tvtvhd.com/", "Accept": "text/html,application/xhtml+xml" }
    });
    let html = pageResp.data;
    let streamReferer = "https://tvtvhd.com/";

    // Step 2: try to find playbackURL directly; if not, follow iframe src one level
    let match = html.match(/var\s+playbackURL\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
    if (!match) {
      // tvtvhd embeds an iframe to an external player (e.g. la18hd.com) — follow it
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (!iframeMatch) return res.status(502).send("No se encontró playbackURL ni iframe src");

      let iframeSrc = iframeMatch[1];
      if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;

      console.log(`📡 tvtvhd-relay: siguiendo iframe → ${iframeSrc}`);
      streamReferer = iframeSrc;

      const iframeResp = await axios.get(iframeSrc, {
        timeout: 12000,
        headers: {
          "User-Agent": UA,
          "Referer": "https://tvtvhd.com/",
          "Accept": "text/html,application/xhtml+xml"
        }
      });
      html = iframeResp.data;
      match = html.match(/var\s+playbackURL\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
      if (!match) return res.status(502).send("No se encontró playbackURL en el player embebido");
    }

    const m3u8Url = match[1];

    // Step 3: fetch the m3u8 content immediately (same server IP = valid token)
    const playerOrigin = (() => { try { return new URL(streamReferer).origin; } catch { return "https://tvtvhd.com"; } })();
    const m3u8Resp = await axios.get(m3u8Url, {
      timeout: 10000,
      headers: { "User-Agent": UA, "Referer": streamReferer, "Origin": playerOrigin }
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const m3u8Base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
    const refParam = `&ref=${encodeURIComponent(streamReferer)}`;

    // Step 4: resolve all relative segment/playlist URLs to absolute
    let content = String(m3u8Resp.data);
    content = content.replace(/^((?!#).+\.ts(?:[?&][^\s]*)?)$/gm, (line) =>
      line.startsWith("http") ? line : m3u8Base + line
    );
    content = content.replace(/^((?!#).+\.m3u8[^\s]*)$/gm, (line) =>
      line.startsWith("http") ? line : m3u8Base + line
    );
    content = content.replace(/URI="([^"]+)"/g, (m, uri) => {
      const abs = uri.startsWith("http") ? uri : m3u8Base + uri;
      return `URI="${abs}"`;
    });

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-cache, no-store");
    console.log(`📡 tvtvhd-relay: token fresco para ${decodedPage}`);
    res.send(content);
  } catch (err) {
    console.error("❌ tvtvhd-relay error:", err.message);
    res.status(502).send("Error en relay: " + err.message);
  }
});

// === PROXY HLS PARA CANALES ===
app.get("/hls-canal", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Falta ?url=");
  let decodedUrl;
  try { decodedUrl = decodeURIComponent(targetUrl); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  // Si es un link de canales.php de la18hd, extraer el m3u8 fresco antes de proxear
  if (decodedUrl.includes("la18hd.com/vivo/canales.php")) {
    try {
      const pageRes = await axios.get(decodedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": "https://la18hd.com/eventos/"
        },
        timeout: 10000
      });
      const m = pageRes.data.toString().match(/var\s+playbackURL\s*=\s*["']([^"']+)["']/);
      if (!m) return res.status(502).send("No se encontró playbackURL en la página");
      decodedUrl = m[1];
    } catch (e) {
      return res.status(502).send("Error extrayendo stream de la18hd: " + e.message);
    }
  }

  const isKhala  = decodedUrl.includes("khala.skylivehd.com") || decodedUrl.includes("skylivehd.com") || decodedUrl.includes("zohanayaan.com");
  const isFubo   = decodedUrl.includes("fubo18.com");
  const hlsHeaders = isKhala ? {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://stream-xhd.com",
    "Referer": "https://stream-xhd.com/"
  } : isFubo ? {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://la18hd.com",
    "Referer": "https://la18hd.com/"
  } : {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://pluto.tv",
    "Referer": "https://pluto.tv/"
  };

  try {
    const upstream = await axios.get(decodedUrl, {
      timeout: 15000,
      headers: hlsHeaders
    });
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const m3u8Base = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);
    let content = upstream.data;

    content = content.replace(/^((?!#).+\.ts(?:[?&][^\s]*)?)$/gm, (line) => {
      const abs = line.startsWith("http") ? line : m3u8Base + line;
      return `${baseUrl}/hls-canal-seg?url=${encodeURIComponent(abs)}`;
    });
    content = content.replace(/^((?!#)(?!.+\/hls-canal).+\.m3u8[^\s]*)$/gm, (line) => {
      const abs = line.startsWith("http") ? line : m3u8Base + line;
      return `${baseUrl}/hls-canal?url=${encodeURIComponent(abs)}`;
    });
    content = content.replace(/URI="([^"]+)"/g, (match, uri) => {
      const abs = uri.startsWith("http") ? uri : m3u8Base + uri;
      return `URI="${baseUrl}/hls-canal-seg?url=${encodeURIComponent(abs)}"`;
    });

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-cache");
    res.send(content);
  } catch (error) {
    console.error("❌ hls-canal error:", error.message);
    res.status(502).send(`Error en proxy m3u8: ${error.message}`);
  }
});

app.get("/hls-canal-seg", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Falta ?url=");
  let decodedUrl;
  try { decodedUrl = decodeURIComponent(targetUrl); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  const isKhalaSeg = decodedUrl.includes("khala.skylivehd.com") || decodedUrl.includes("skylivehd.com") || decodedUrl.includes("zohanayaan.com");
  const isFuboSeg  = decodedUrl.includes("fubo18.com");
  const segHeaders = isKhalaSeg ? {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://stream-xhd.com",
    "Referer": "https://stream-xhd.com/"
  } : isFuboSeg ? {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://la18hd.com",
    "Referer": "https://la18hd.com/"
  } : {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://pluto.tv",
    "Referer": "https://pluto.tv/"
  };

  try {
    const upstream = await axios.get(decodedUrl, {
      timeout: 20000,
      responseType: "arraybuffer",
      headers: segHeaders
    });
    const contentType = upstream.headers["content-type"] || "video/MP2T";
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-cache");
    res.send(upstream.data);
  } catch (error) {
    console.error("❌ hls-canal-seg error:", error.message);
    res.status(502).send(`Error en proxy segmento: ${error.message}`);
  }
});

// === REPRODUCTOR DE CANALES ===
app.get("/canal-player", (req, res) => {
  const { url, nombre, categorias, pais, bandera, fuente, logo, streams } = req.query;
  if (!url) return res.status(400).send("Falta el parámetro ?url=");

  let decodedUrl;
  try { decodedUrl = decodeURIComponent(url); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  const canalNombre = nombre ? decodeURIComponent(nombre) : "Canal en vivo";
  const canalPais = pais ? decodeURIComponent(pais) : null;
  const canalBandera = bandera ? decodeURIComponent(bandera) : null;
  const canalFuente = fuente ? decodeURIComponent(fuente) : null;
  const canalLogo = logo ? decodeURIComponent(logo) : null;
  const canalCategorias = categorias ? decodeURIComponent(categorias).split(",").map(c => c.trim()).filter(Boolean) : [];

  const baseUrl = `${req.protocol}://${req.get("host")}`;

  let señales = [];
  try { señales = streams ? JSON.parse(decodeURIComponent(streams)) : []; } catch {}
  if (!señales.length) señales = [{ url: decodedUrl, label: "Señal 1" }];

  const needsProxy = (u) => !u.includes("/hls-canal?");
  señales = señales.map(s => ({
    ...s,
    url: needsProxy(s.url) ? `${baseUrl}/hls-canal?url=${encodeURIComponent(s.url)}` : s.url
  }));

  const señalesJson = JSON.stringify(señales).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  const escNombre = canalNombre.replace(/[<>"']/g, c => ({"<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  const señalesCount = señales.length;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${escNombre} — EN VIVO · Ultragol</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{
  --y:#f5c518;--y2:#e8a800;--yd:#c48500;
  --grad:linear-gradient(135deg,#f5c518 0%,#e8a800 60%,#c48500 100%);
  --glow:rgba(245,197,24,.5);--glow2:rgba(245,197,24,.15);
  --bg:#060604;--panel:rgba(8,7,3,.92);--border:rgba(245,197,24,.2);
  --ctrl-h:52px;--top-h:0px;
}
html,body{width:100%;height:100%;background:var(--bg);overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;color:#fff}

/* ── WRAP ── */
#pw{position:relative;width:100%;height:100%;background:#000;overflow:hidden}
video{width:100%;height:100%;object-fit:contain;display:block;background:#000}

/* ── TOP BAR ── */
#topBar{
  position:absolute;top:0;left:0;right:0;z-index:14;
  padding:10px 14px 0;
  background:linear-gradient(to bottom,rgba(0,0,0,.78) 0%,transparent 100%);
  display:flex;align-items:center;gap:10px;
  opacity:0;transition:opacity .3s;pointer-events:none;
}
#pw.showCtrl #topBar{opacity:1;pointer-events:auto}
#topTitle{
  font-size:13px;font-weight:700;letter-spacing:.4px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 80px);
  background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

/* ── LIVE BADGE ── */
#liveBadge{
  position:absolute;top:12px;right:14px;z-index:15;
  display:flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:20px;
  background:rgba(0,0,0,.75);border:1px solid var(--border);
  backdrop-filter:blur(12px);font-size:9px;font-weight:800;letter-spacing:1.2px;
}
#liveDot{width:7px;height:7px;border-radius:50%;background:var(--y);box-shadow:0 0 8px var(--glow);animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}

/* ── LOADER ── */
#loader{
  position:absolute;inset:0;z-index:22;background:#000;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
}
.lring{
  width:52px;height:52px;border-radius:50%;
  border:3px solid rgba(245,197,24,.15);
  border-top-color:var(--y);border-right-color:var(--y2);
  animation:spin .85s linear infinite;
  box-shadow:0 0 20px var(--glow2);
}
@keyframes spin{to{transform:rotate(360deg)}}
#loaderTxt{font-size:11px;font-weight:700;letter-spacing:.8px;color:var(--y);opacity:.85}
#loaderSub{font-size:10px;color:rgba(255,255,255,.35);letter-spacing:.5px}

/* ── CONTROLS ── */
#ctrl{
  position:absolute;bottom:0;left:0;right:0;z-index:12;
  background:linear-gradient(transparent,rgba(0,0,0,.9) 70%);
  padding:20px 0 0;
  opacity:0;transition:opacity .3s;pointer-events:none;
}
#pw.showCtrl #ctrl{opacity:1;pointer-events:auto}

/* progress */
#pBar{position:relative;height:20px;margin:0 14px;cursor:pointer;display:flex;align-items:center}
#pBg{position:absolute;left:0;right:0;height:3px;background:rgba(255,255,255,.18);border-radius:3px;transition:height .15s}
#pBar:hover #pBg{height:5px}
#pLive{position:absolute;left:0;right:0;height:100%;background:linear-gradient(90deg,rgba(245,197,24,.4),rgba(245,197,24,.08));border-radius:3px;display:none}
#pFill{position:absolute;left:0;height:100%;background:var(--grad);border-radius:3px;width:0%;box-shadow:0 0 6px var(--glow2)}
#pThumb{
  position:absolute;width:13px;height:13px;border-radius:50%;background:var(--y);
  box-shadow:0 0 0 3px rgba(245,197,24,.3);
  top:50%;transform:translate(-50%,-50%);left:0%;display:none;
  transition:transform .1s;
}
#pBar:hover #pThumb{display:block}

/* btn row */
#bRow{display:flex;align-items:center;gap:4px;padding:4px 8px 8px}
.btn{
  background:none;border:none;color:rgba(255,255,255,.78);
  cursor:pointer;padding:6px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  transition:background .12s,color .12s;flex-shrink:0;
}
.btn:hover{background:rgba(245,197,24,.14);color:#fff}
.btn:active{background:rgba(245,197,24,.28)}
.btn svg{width:22px;height:22px}
.btn svg path{fill:url(#ig)}
#sp{flex:1}
#tLbl{font-size:11px;font-weight:600;color:rgba(255,255,255,.65);white-space:nowrap;padding:0 4px}

/* volume */
#vWrap{position:relative}
#vPanel{
  position:absolute;bottom:calc(100% + 10px);left:50%;
  transform:translateX(-50%) translateY(6px) scale(.92);transform-origin:bottom;
  display:flex;flex-direction:column;align-items:center;gap:7px;
  padding:12px 9px;border-radius:16px;
  background:var(--panel);border:1px solid var(--border);
  backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,.7),0 0 0 1px rgba(245,197,24,.06);
  opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;z-index:22;
}
#vPanel.open{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0) scale(1)}
#vPct{font-size:10px;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
#vTrack{position:relative;width:8px;height:84px;background:rgba(255,255,255,.1);border-radius:4px}
#vFill{position:absolute;bottom:0;left:0;width:100%;background:var(--grad);border-radius:4px;transition:height .06s}
#vThumb{position:absolute;left:50%;transform:translateX(-50%);width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 0 0 2.5px var(--y2);pointer-events:none;z-index:2;transition:bottom .06s}
#vSlider{position:absolute;inset:-8px;opacity:0;cursor:pointer;writing-mode:vertical-lr;direction:rtl;width:calc(100%+16px);height:calc(100%+16px)}

/* quality selector */
#qWrap{position:relative}
#qPanel{
  position:absolute;bottom:calc(100% + 10px);right:0;
  min-width:120px;
  border-radius:14px;
  background:var(--panel);border:1px solid var(--border);
  backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,.7);
  overflow:hidden;
  opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;
  transform:translateY(6px) scale(.95);transform-origin:bottom right;z-index:22;
}
#qPanel.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}
#qHeader{font-size:9px;font-weight:800;letter-spacing:1px;color:var(--y);padding:10px 12px 6px;border-bottom:1px solid var(--border)}
.qItem{
  display:flex;align-items:center;gap:8px;padding:8px 12px;
  font-size:12px;font-weight:600;cursor:pointer;transition:background .12s;
  color:rgba(255,255,255,.78);
}
.qItem:hover{background:rgba(245,197,24,.1);color:#fff}
.qItem.active{color:var(--y)}
.qDot{width:6px;height:6px;border-radius:50%;background:var(--grad);flex-shrink:0;opacity:0}
.qItem.active .qDot{opacity:1}

/* signals bar */
#signals{
  display:${señalesCount>1?"flex":"none"};
  gap:6px;padding:0 14px 10px;overflow-x:auto;
  scrollbar-width:none;
}
#signals::-webkit-scrollbar{display:none}
.sig{
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
  color:rgba(255,255,255,.65);font-size:11px;font-weight:600;
  padding:5px 12px;border-radius:20px;cursor:pointer;
  white-space:nowrap;flex-shrink:0;transition:all .18s;
}
.sig.active{background:rgba(245,197,24,.18);border-color:var(--y);color:var(--y);box-shadow:0 0 10px var(--glow2)}
.sig:hover:not(.active){background:rgba(255,255,255,.13);color:#fff}

/* tap feedback */
#tapFx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6}
.tCirc{
  width:70px;height:70px;border-radius:50%;
  background:rgba(245,197,24,.12);border:1.5px solid rgba(245,197,24,.4);
  display:flex;align-items:center;justify-content:center;
  opacity:0;transform:scale(.4);
  transition:opacity .22s,transform .22s;
  backdrop-filter:blur(4px);
}
.tCirc.show{opacity:1;transform:scale(1)}
.tCirc svg{width:30px;height:30px}
.tCirc svg path{fill:var(--y)}

/* error overlay */
#errOv{
  position:absolute;inset:0;background:rgba(0,0,0,.93);
  display:none;flex-direction:column;align-items:center;justify-content:center;
  z-index:32;gap:14px;padding:28px;text-align:center;
}
#errOv svg{width:52px;height:52px}
#errOv svg path{fill:var(--y)}
#errOv h2{font-size:18px;font-weight:800}
#errOv p{font-size:12px;color:rgba(255,255,255,.45);max-width:280px;line-height:1.6}
#errCodes{font-size:10px;color:rgba(245,197,24,.5);font-family:monospace;margin-top:-4px}
#retryBtn{
  background:var(--grad);color:#000;border:none;
  padding:11px 28px;border-radius:10px;font-size:13px;font-weight:800;
  cursor:pointer;letter-spacing:.3px;
  box-shadow:0 4px 20px var(--glow2);
  transition:opacity .2s,transform .1s;
}
#retryBtn:hover{opacity:.88}
#retryBtn:active{transform:scale(.97)}

/* watermark */
#wm{
  position:absolute;bottom:${señalesCount>1?"62px":"54px"};right:12px;z-index:8;
  opacity:.18;pointer-events:none;user-select:none;
  transition:opacity .3s;
}
#pw.showCtrl #wm{opacity:.1}
#wmTxt{
  font-size:13px;font-weight:900;letter-spacing:1.5px;
  background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

/* buffering spinner over video */
#bufSpin{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:40px;height:40px;border-radius:50%;z-index:11;
  border:2.5px solid rgba(245,197,24,.15);border-top-color:var(--y);
  animation:spin .85s linear infinite;display:none;pointer-events:none;
}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute;overflow:hidden">
<defs>
  <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f5c518"/><stop offset="100%" stop-color="#c48500"/>
  </linearGradient>
</defs>
</svg>

<div id="pw">
  <video id="vid" playsinline webkit-playsinline></video>
  <div id="bufSpin"></div>

  <!-- top -->
  <div id="topBar"><span id="topTitle">${escNombre}</span></div>
  <div id="liveBadge"><div id="liveDot"></div><span>EN VIVO</span></div>

  <!-- loader -->
  <div id="loader">
    <div class="lring"></div>
    <div id="loaderTxt">CONECTANDO</div>
    <div id="loaderSub">Obteniendo stream…</div>
  </div>

  <!-- tap -->
  <div id="tapFx"><div class="tCirc" id="tC"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>

  <!-- controls -->
  <div id="ctrl">
    <!-- progress -->
    <div id="pBar">
      <div id="pBg"><div id="pLive"></div><div id="pFill"></div></div>
      <div id="pThumb"></div>
    </div>
    <!-- btn row -->
    <div id="bRow">
      <button class="btn" id="bPlay"><svg viewBox="0 0 24 24" id="piSvg"><path d="M8 5v14l11-7z"/></svg></button>
      <div id="vWrap">
        <button class="btn" id="bVol" title="Volumen"><svg viewBox="0 0 24 24" id="viSvg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg></button>
        <div id="vPanel">
          <span id="vPct">100%</span>
          <div id="vTrack"><div id="vFill" style="height:100%"></div><div id="vThumb" style="bottom:calc(100% - 7px)"></div><input type="range" id="vSlider" min="0" max="100" step="1" value="100"></div>
        </div>
      </div>
      <span id="tLbl">EN VIVO</span>
      <div id="sp"></div>
      <div id="qWrap">
        <button class="btn" id="bQ" title="Calidad" style="font-size:10px;font-weight:800;color:var(--y);padding:6px 8px;letter-spacing:.3px">AUTO</button>
        <div id="qPanel"><div id="qHeader">CALIDAD</div><div id="qList"></div></div>
      </div>
      <button class="btn" id="bPip" title="Imagen en imagen" style="display:none"><svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg></button>
      <button class="btn" id="bFs"><svg viewBox="0 0 24 24" id="fiSvg"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
    </div>
    <!-- signals -->
    <div id="signals">${señales.map((s,i)=>`<button class="sig${i===0?" active":""}" onclick="UG.switchStream(${i})">${s.label||"Señal "+(i+1)}</button>`).join("")}</div>
  </div>

  <!-- error -->
  <div id="errOv">
    <svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
    <h2>Stream no disponible</h2>
    <p>El canal puede no estar en línea ahora. Intenta con otra señal o vuelve más tarde.</p>
    <div id="errCodes"></div>
    <button id="retryBtn">↺ Reintentar</button>
  </div>

  <!-- watermark -->
  <div id="wm"><span id="wmTxt">ULTRAGOL</span></div>
</div>

<script>
(function(){
var STREAMS=${señalesJson};
var vid=document.getElementById("vid"),
    pw=document.getElementById("pw"),
    loader=document.getElementById("loader"),
    loaderTxt=document.getElementById("loaderTxt"),
    loaderSub=document.getElementById("loaderSub"),
    errOv=document.getElementById("errOv"),
    errCodes=document.getElementById("errCodes"),
    bPlay=document.getElementById("bPlay"),piSvg=document.getElementById("piSvg"),
    bVol=document.getElementById("bVol"),viSvg=document.getElementById("viSvg"),
    vPanel=document.getElementById("vPanel"),vFill=document.getElementById("vFill"),
    vThumb=document.getElementById("vThumb"),vPct=document.getElementById("vPct"),
    vSlider=document.getElementById("vSlider"),
    tLbl=document.getElementById("tLbl"),
    pFill=document.getElementById("pFill"),pLive=document.getElementById("pLive"),pThumb=document.getElementById("pThumb"),pBar=document.getElementById("pBar"),
    bFs=document.getElementById("bFs"),fiSvg=document.getElementById("fiSvg"),
    bPip=document.getElementById("bPip"),
    bQ=document.getElementById("bQ"),qPanel=document.getElementById("qPanel"),qList=document.getElementById("qList"),
    tC=document.getElementById("tC"),
    bufSpin=document.getElementById("bufSpin"),
    retryBtn=document.getElementById("retryBtn");

var hls=null,idx=0,retries=0,maxR=4,live=true,ctrlT,tapT,vPanT,qPanT;

var IC={
  play:'<path d="M8 5v14l11-7z"/>',
  pause:'<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
  vOn:'<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',
  vOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
  fsOn:'<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
  fsOff:'<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
};
function si(el,k){el.innerHTML=IC[k];}

/* ctrl visibility */
function showCtrl(){pw.classList.add("showCtrl");clearTimeout(ctrlT);ctrlT=setTimeout(function(){pw.classList.remove("showCtrl");},3200);}
pw.addEventListener("mousemove",showCtrl);
pw.addEventListener("touchstart",showCtrl,{passive:true});
showCtrl();

/* loader */
function showLoad(msg,sub){loaderTxt.textContent=msg||"CONECTANDO";loaderSub.textContent=sub||"Obteniendo stream…";loader.style.display="flex";}
function hideLoad(){loader.style.display="none";}
function showErr(code){errOv.style.display="flex";loader.style.display="none";bufSpin.style.display="none";errCodes.textContent=code?"Código: "+code:"";}

/* tap flash */
function flash(icon){
  tC.querySelector("svg path").setAttribute("d",IC[icon].replace(/<path d="/,"").replace('"/>',''));
  tC.classList.add("show");clearTimeout(tapT);tapT=setTimeout(function(){tC.classList.remove("show");},550);
}

/* play/pause */
function togglePlay(){
  if(vid.paused){vid.play().catch(function(){});si(piSvg,"pause");flash("pause");}
  else{vid.pause();si(piSvg,"play");flash("play");}
}
bPlay.addEventListener("click",function(e){e.stopPropagation();togglePlay();});
vid.addEventListener("click",togglePlay);
vid.addEventListener("play",function(){si(piSvg,"pause");});
vid.addEventListener("pause",function(){si(piSvg,"play");});
vid.addEventListener("waiting",function(){bufSpin.style.display="block";});
vid.addEventListener("playing",function(){bufSpin.style.display="none";});
vid.addEventListener("canplay",function(){bufSpin.style.display="none";});

/* volume */
function updVol(){
  var p=vid.muted?0:Math.round(vid.volume*100);
  vSlider.value=p;vPct.textContent=p+"%";
  vFill.style.height=p+"%";vThumb.style.bottom="calc("+p+"% - 7px)";
  si(viSvg,(vid.muted||p===0)?"vOff":"vOn");
}
function openVol(){vPanel.classList.add("open");clearTimeout(vPanT);vPanT=setTimeout(function(){vPanel.classList.remove("open");},3200);}
bVol.addEventListener("click",function(e){
  e.stopPropagation();
  if(!vPanel.classList.contains("open"))openVol();
  else{vid.muted=!vid.muted;updVol();clearTimeout(vPanT);vPanT=setTimeout(function(){vPanel.classList.remove("open");},1800);}
});
vSlider.addEventListener("input",function(){
  var v=+this.value/100;vid.volume=v;vid.muted=v===0;
  updVol();clearTimeout(vPanT);vPanT=setTimeout(function(){vPanel.classList.remove("open");},2500);
});
pw.addEventListener("click",function(e){
  if(!e.target.closest("#vWrap"))vPanel.classList.remove("open");
  if(!e.target.closest("#qWrap"))qPanel.classList.remove("open");
});

/* fullscreen */
bFs.addEventListener("click",function(){
  var d=document,el=document.documentElement;
  if(!d.fullscreenElement&&!d.webkitFullscreenElement){
    (el.requestFullscreen||el.webkitRequestFullscreen).call(el);si(fiSvg,"fsOff");
  } else {
    (d.exitFullscreen||d.webkitExitFullscreen).call(d);si(fiSvg,"fsOn");
  }
});
document.addEventListener("fullscreenchange",function(){if(!document.fullscreenElement)si(fiSvg,"fsOn");});
document.addEventListener("webkitfullscreenchange",function(){if(!document.webkitFullscreenElement)si(fiSvg,"fsOn");});

/* PiP */
if(document.pictureInPictureEnabled){
  bPip.style.display="flex";
  bPip.addEventListener("click",function(){
    if(document.pictureInPictureElement)document.exitPictureInPicture().catch(function(){});
    else vid.requestPictureInPicture().catch(function(){});
  });
}

/* progress */
function updProgress(){
  if(live){pLive.style.display="block";pFill.style.width="100%";pThumb.style.left="100%";tLbl.textContent="EN VIVO";}
  else{
    pLive.style.display="none";
    var pct=vid.duration>0?(vid.currentTime/vid.duration*100):0;
    pFill.style.width=pct+"%";pThumb.style.left=pct+"%";
    var c=Math.floor(vid.currentTime),d=Math.floor(vid.duration||0);
    tLbl.textContent=fmt(c)+(d>0?" / "+fmt(d):"");
  }
}
function fmt(s){var m=Math.floor(s/60),ss=Math.floor(s%60);return m+":"+(ss<10?"0":"")+ss;}
vid.addEventListener("timeupdate",updProgress);
pBar.addEventListener("click",function(e){
  if(live)return;
  var r=pBar.getBoundingClientRect();
  var pct=(e.clientX-r.left)/r.width;
  vid.currentTime=pct*vid.duration;
});

/* quality menu */
function buildQuality(levels,current){
  qList.innerHTML="";
  var autoEl=document.createElement("div");
  autoEl.className="qItem"+(current===-1?" active":"");
  autoEl.innerHTML='<span class="qDot"></span>AUTO';
  autoEl.onclick=function(){if(hls)hls.currentLevel=-1;bQ.textContent="AUTO";setQActive(-1);qPanel.classList.remove("open");};
  qList.appendChild(autoEl);
  levels.forEach(function(l,i){
    var el=document.createElement("div");
    var lbl=l.height?l.height+"p":(l.bitrate?Math.round(l.bitrate/1000)+"k":"Señal "+(i+1));
    el.className="qItem"+(i===current?" active":"");
    el.innerHTML='<span class="qDot"></span>'+lbl;
    el.onclick=function(){if(hls)hls.currentLevel=i;bQ.textContent=lbl;setQActive(i);qPanel.classList.remove("open");};
    qList.appendChild(el);
  });
}
function setQActive(lvl){
  qList.querySelectorAll(".qItem").forEach(function(el,i){
    el.classList.toggle("active",i===(lvl===-1?0:lvl+1));
  });
}
bQ.addEventListener("click",function(e){
  e.stopPropagation();
  qPanel.classList.toggle("open");
  clearTimeout(qPanT);if(qPanel.classList.contains("open"))qPanT=setTimeout(function(){qPanel.classList.remove("open");},5000);
});

/* init player */
function initPlayer(src){
  showLoad(retries>0?"REINTENTANDO ("+(retries)+"/"+maxR+")":"CONECTANDO",src.includes("khala")?"skylivehd.com":"stream.live");
  errOv.style.display="none";bufSpin.style.display="none";
  if(hls){hls.destroy();hls=null;}
  if(typeof Hls!=="undefined"&&Hls.isSupported()){
    hls=new Hls({
      maxBufferLength:25,maxMaxBufferLength:60,
      liveSyncDurationCount:3,liveMaxLatencyDurationCount:6,
      manifestLoadingMaxRetry:4,levelLoadingMaxRetry:4,fragLoadingMaxRetry:4,
      enableWorker:true,lowLatencyMode:false,
      xhrSetup:function(xhr){xhr.withCredentials=false;}
    });
    hls.loadSource(src);
    hls.attachMedia(vid);
    hls.on(Hls.Events.MANIFEST_PARSED,function(e,data){
      hideLoad();
      live=vid.duration===Infinity||isNaN(vid.duration);
      updProgress();
      if(data.levels&&data.levels.length>1)buildQuality(data.levels,-1);
      else qList.innerHTML="<div class='qItem active'><span class='qDot'></span>AUTO</div>";
      vid.play().catch(function(){});
      retries=0;
    });
    hls.on(Hls.Events.LEVEL_SWITCHED,function(e,data){
      if(hls.currentLevel>=0&&hls.levels[hls.currentLevel]){
        var l=hls.levels[hls.currentLevel];
        if(bQ.textContent==="AUTO"){var lbl=l.height?l.height+"p":"AUTO";bQ.textContent=lbl;}
      }
    });
    hls.on(Hls.Events.ERROR,function(e,data){
      if(data.fatal){
        hls.destroy();hls=null;
        if(retries<maxR){retries++;setTimeout(function(){initPlayer(STREAMS[idx].url);},2500+retries*1000);}
        else showErr(data.type);
      }
    });
  } else if(vid.canPlayType("application/vnd.apple.mpegurl")){
    vid.src=src;
    vid.addEventListener("loadedmetadata",function once(){vid.removeEventListener("loadedmetadata",once);hideLoad();vid.play().catch(function(){});});
    vid.addEventListener("error",function(){if(retries<maxR){retries++;setTimeout(function(){initPlayer(STREAMS[idx].url);},3000);}else showErr();});
  } else {showErr("NO_HLS");}
}

/* switch signal */
window.UG={switchStream:function(i){
  idx=i;retries=0;
  document.querySelectorAll(".sig").forEach(function(b,j){b.classList.toggle("active",j===i);});
  initPlayer(STREAMS[i].url);
}};

retryBtn.addEventListener("click",function(){retries=0;initPlayer(STREAMS[idx].url);});

/* keyboard */
document.addEventListener("keydown",function(e){
  if(e.key===" "||e.key==="k"){e.preventDefault();togglePlay();}
  if(e.key==="f"||e.key==="F"){bFs.click();}
  if(e.key==="m"||e.key==="M"){vid.muted=!vid.muted;updVol();}
  if(e.key==="ArrowUp"){vid.volume=Math.min(1,vid.volume+.1);vid.muted=false;updVol();}
  if(e.key==="ArrowDown"){vid.volume=Math.max(0,vid.volume-.1);vid.muted=vid.volume===0;updVol();}
});

initPlayer(STREAMS[0].url);
})();
</script>
</body>
</html>`;

  res.set("Content-Type","text/html; charset=utf-8");
  res.set("Access-Control-Allow-Origin","*");
  res.set("X-Frame-Options","ALLOWALL");
  res.set("Cache-Control","no-cache");
  res.send(html);
});

// === CANALES (fuente: famelack/IPTV-org + Pluto TV) ===
app.get("/canales", async (req, res) => {
  try {
    let data = cache.get("canales");
    
    if (!data) {
      console.log("📺 Obteniendo canales desde IPTV-org y Pluto TV - caché vacío...");
      data = await scrapCanales();
      if (data.success) {
        cache.set("canales", data, 3600);
      }
    }

    if (data.success) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const enriched = {
        ...data,
        canales: data.canales.map(canal => {
          const { streams, ...canalSinStreams } = canal;
          const firstStream = streams?.[0]?.url || "";
          const params = new URLSearchParams({
            url: firstStream,
            nombre: canal.nombre || "",
            categorias: (canal.categorias || []).join(","),
            pais: canal.pais || "",
            bandera: canal.bandera || "",
            fuente: canal.fuente || "",
            logo: canal.logo || ""
          });
          return {
            ...canalSinStreams,
            player_url: `${baseUrl}/canal-player?${params.toString()}`
          };
        })
      };
      return res.json(enriched);
    }

    res.json(data);
  } catch (error) {
    console.error("Error en /canales:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los canales",
      detalles: error.message 
    });
  }
});

app.get("/canales/pais/:codigo", async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const cacheKey = `canales_pais_${codigo.toLowerCase()}`;
    let data = cache.get(cacheKey);
    
    if (!data) {
      data = await scrapCanalesPorPais(codigo);
      if (data.success) {
        cache.set(cacheKey, data, 3600);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /canales/pais:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los canales del país",
      detalles: error.message 
    });
  }
});

app.get("/canales/categoria/:categoria", async (req, res) => {
  try {
    const categoria = req.params.categoria;
    const cacheKey = `canales_cat_${categoria.toLowerCase()}`;
    let data = cache.get(cacheKey);
    
    if (!data) {
      data = await scrapCanalesPorCategoria(categoria);
      if (data.success) {
        cache.set(cacheKey, data, 3600);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /canales/categoria:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los canales de la categoría",
      detalles: error.message 
    });
  }
});

app.get("/canales/deportes", async (req, res) => {
  try {
    let data = cache.get("canales_deportes");
    
    if (!data) {
      data = await scrapCanalesDeportes();
      if (data.success) {
        cache.set("canales_deportes", data, 3600);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /canales/deportes:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los canales deportivos",
      detalles: error.message 
    });
  }
});

// === CANALES PREMIUM (fuente: 90minutos) ===
app.get("/canales/premium", async (req, res) => {
  try {
    let data = cache.get("canales_premium");
    
    if (!data) {
      console.log("📺 Obteniendo canales premium - caché vacío...");
      data = await scrapCanalesPremium();
      if (data.success) {
        cache.set("canales_premium", data, 1800);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /canales/premium:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los canales premium",
      detalles: error.message 
    });
  }
});


app.get("/canales2", async (req, res) => {
  try {
    const { pais, categoria, buscar, limite } = req.query;
    const tienesFiltros = pais || categoria || buscar || limite;

    // Sin filtros: usar caché de 30 min
    const cacheKey = tienesFiltros
      ? `canales2_${pais||""}_${categoria||""}_${buscar||""}_${limite||""}`
      : "canales2";

    let data = cache.get(cacheKey);

    if (!data) {
      console.log("📺 Obteniendo canales2 desde IPTV-org - caché vacío...");
      data = await scrapCanales2({ pais, categoria, buscar, limite });
      if (data.success) {
        cache.set(cacheKey, data, 1800);
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Error en /canales2:", error.message);
    res.status(500).json({
      error: "No se pudieron obtener los canales de IPTV-org",
      detalles: error.message
    });
  }
});


app.get("/marcadores", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapMarcadoresLigaMX(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /marcadores:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los marcadores de Liga MX",
      detalles: error.message 
    });
  }
});

app.get("/premier/marcadores", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapMarcadoresPremier(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/marcadores:", error.message);
    res.status(500).json({ 
      error: "Could not fetch Premier League scores",
      detalles: error.message 
    });
  }
});

app.get("/laliga/marcadores", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapMarcadoresLaLiga(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/marcadores:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los marcadores de La Liga",
      detalles: error.message 
    });
  }
});

app.get("/seriea/marcadores", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapMarcadoresSerieA(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/marcadores:", error.message);
    res.status(500).json({ 
      error: "Impossibile ottenere i punteggi di Serie A",
      detalles: error.message 
    });
  }
});

app.get("/bundesliga/marcadores", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapMarcadoresBundesliga(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/marcadores:", error.message);
    res.status(500).json({ 
      error: "Bundesliga-Ergebnisse konnten nicht abgerufen werden",
      detalles: error.message 
    });
  }
});

app.get("/ligue1/marcadores", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapMarcadoresLigue1(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/marcadores:", error.message);
    res.status(500).json({ 
      error: "Impossible d'obtenir les scores de Ligue 1",
      detalles: error.message 
    });
  }
});

app.get("/marcadores/todas-las-ligas", async (req, res) => {
  try {
    const date = req.query.date || null;
    console.log("⚽ Obteniendo marcadores de todas las ligas...");
    
    const [ligaMx, premierLeague, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
      scrapMarcadoresLigaMX(date).catch(err => { console.error("Error Liga MX marcadores:", err.message); return null; }),
      scrapMarcadoresPremier(date).catch(err => { console.error("Error Premier marcadores:", err.message); return null; }),
      scrapMarcadoresLaLiga(date).catch(err => { console.error("Error La Liga marcadores:", err.message); return null; }),
      scrapMarcadoresSerieA(date).catch(err => { console.error("Error Serie A marcadores:", err.message); return null; }),
      scrapMarcadoresBundesliga(date).catch(err => { console.error("Error Bundesliga marcadores:", err.message); return null; }),
      scrapMarcadoresLigue1(date).catch(err => { console.error("Error Ligue 1 marcadores:", err.message); return null; })
    ]);

    const todasLasLigas = {
      actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      totalLigas: 6,
      fecha: date || "Hoy",
      ligas: [
        {
          nombre: "Liga MX",
          pais: "México",
          codigo: "ligamx",
          totalPartidos: ligaMx?.total || 0,
          partidos: ligaMx?.partidos || []
        },
        {
          nombre: "Premier League",
          pais: "Inglaterra",
          codigo: "premier",
          totalPartidos: premierLeague?.total || 0,
          partidos: premierLeague?.partidos || []
        },
        {
          nombre: "La Liga",
          pais: "España",
          codigo: "laliga",
          totalPartidos: laLiga?.total || 0,
          partidos: laLiga?.partidos || []
        },
        {
          nombre: "Serie A",
          pais: "Italia",
          codigo: "seriea",
          totalPartidos: serieA?.total || 0,
          partidos: serieA?.partidos || []
        },
        {
          nombre: "Bundesliga",
          pais: "Alemania",
          codigo: "bundesliga",
          totalPartidos: bundesliga?.total || 0,
          partidos: bundesliga?.partidos || []
        },
        {
          nombre: "Ligue 1",
          pais: "Francia",
          codigo: "ligue1",
          totalPartidos: ligue1?.total || 0,
          partidos: ligue1?.partidos || []
        }
      ],
      totalPartidos: 
        (ligaMx?.total || 0) + 
        (premierLeague?.total || 0) + 
        (laLiga?.total || 0) + 
        (serieA?.total || 0) + 
        (bundesliga?.total || 0) + 
        (ligue1?.total || 0)
    };

    res.json(todasLasLigas);
  } catch (error) {
    console.error("Error en /marcadores/todas-las-ligas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los marcadores",
      detalles: error.message 
    });
  }
});

app.get("/alineaciones", async (req, res) => {
  try {
    const date = req.query.date || null;
    const cacheKey = `alineaciones_ligamx_${date || 'hoy'}`;
    
    let data = cache.get(cacheKey);
    if (!data) {
      console.log("⚽ Obteniendo alineaciones Liga MX (caché vacío)...");
      data = await scrapAlineacionesLigaMX(date);
      cache.set(cacheKey, data, 900);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /alineaciones:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las alineaciones",
      detalles: error.message 
    });
  }
});

app.get("/premier/alineaciones", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapAlineacionesPremier(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/alineaciones:", error.message);
    res.status(500).json({ 
      error: "Could not fetch Premier League lineups",
      detalles: error.message 
    });
  }
});

app.get("/laliga/alineaciones", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapAlineacionesLaLiga(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/alineaciones:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las alineaciones de La Liga",
      detalles: error.message 
    });
  }
});

app.get("/seriea/alineaciones", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapAlineacionesSerieA(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/alineaciones:", error.message);
    res.status(500).json({ 
      error: "Impossibile ottenere le formazioni di Serie A",
      detalles: error.message 
    });
  }
});

app.get("/bundesliga/alineaciones", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapAlineacionesBundesliga(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/alineaciones:", error.message);
    res.status(500).json({ 
      error: "Bundesliga-Aufstellungen konnten nicht abgerufen werden",
      detalles: error.message 
    });
  }
});

app.get("/ligue1/alineaciones", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapAlineacionesLigue1(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/alineaciones:", error.message);
    res.status(500).json({ 
      error: "Impossible d'obtenir les compositions de Ligue 1",
      detalles: error.message 
    });
  }
});

app.get("/alineaciones/todas-las-ligas", async (req, res) => {
  try {
    const date = req.query.date || null;
    const data = await scrapAlineacionesTodasLasLigas(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /alineaciones/todas-las-ligas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las alineaciones de todas las ligas",
      detalles: error.message 
    });
  }
});

app.get("/alineaciones/partido/:eventId", async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const data = await scrapAlineacionPartido(eventId);
    res.json(data);
  } catch (error) {
    console.error("Error en /alineaciones/partido/:eventId:", error.message);
    res.status(500).json({ 
      error: "No se pudo obtener la alineación del partido",
      detalles: error.message 
    });
  }
});

app.get("/alineaciones/stats", async (req, res) => {
  try {
    const stats = getPhotoStats();
    res.json({
      sistema: "Sistema de Alineaciones - Métricas Profesionales",
      version: "3.3.0",
      actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      metricas: {
        fotosJugadores: {
          totalSolicitudes: stats.totalRequests,
          cachéHits: stats.cacheHits,
          tasaCachéHit: stats.cacheHitRate,
          provistaPorESPN: stats.espnProvided,
          enriquecidaPorTheSportsDB: stats.theSportsDbSuccess,
          fallosTheSportsDB: stats.theSportsDbFail,
          placeholdersGenerados: stats.placeholderUsed,
          tasaEnriquecimiento: stats.enrichmentRate
        },
        rendimiento: {
          optimizacion: "Memoización activa",
          cachéActivo: true,
          actualizacionAutomatica: "Cada 15 minutos"
        }
      },
      descripcion: "El sistema usa memoización para evitar llamadas duplicadas. Las fotos provienen de ESPN (principal), TheSportsDB (fallback) y placeholders generados (último recurso)."
    });
  } catch (error) {
    console.error("Error en /alineaciones/stats:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

app.get("/notificaciones", async (req, res) => {
  try {
    console.log("🔔 Generando notificaciones de todas las ligas...");
    const notificaciones = generarNotificaciones('todas');
    
    res.json({
      success: true,
      total: notificaciones.length,
      actualizado: new Date().toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City' 
      }),
      logo: "https://ultragol-l3ho.com.mx/attached_assets/1001721720-removebg-preview_1759201879566.png",
      descripcion: "Notificaciones inteligentes de partidos - En vivo, próximos a iniciar y del día",
      notificaciones: notificaciones
    });
  } catch (error) {
    console.error("Error en /notificaciones:", error.message);
    res.status(500).json({ 
      success: false,
      error: "No se pudieron generar las notificaciones",
      detalles: error.message 
    });
  }
});

app.get("/notificaciones/stats", async (req, res) => {
  try {
    console.log("📊 Generando estadísticas de notificaciones...");
    const stats = obtenerEstadisticasNotificaciones();
    
    res.json({
      success: true,
      actualizado: new Date().toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City' 
      }),
      estadisticas: stats,
      descripcion: "Estadísticas del sistema de notificaciones"
    });
  } catch (error) {
    console.error("Error en /notificaciones/stats:", error.message);
    res.status(500).json({ 
      success: false,
      error: "No se pudieron generar las estadísticas",
      detalles: error.message 
    });
  }
});

app.get("/notificaciones/:liga", async (req, res) => {
  try {
    const liga = req.params.liga.toLowerCase();
    const ligasValidas = ['ligamx', 'premier', 'laliga', 'seriea', 'bundesliga', 'ligue1'];
    
    if (!ligasValidas.includes(liga)) {
      return res.status(400).json({ 
        success: false,
        error: "Liga no válida",
        ligasValidas: ligasValidas,
        ejemplo: "/notificaciones/premier"
      });
    }
    
    console.log(`🔔 Generando notificaciones de ${liga}...`);
    const notificaciones = generarNotificaciones(liga);
    
    const ligasNombres = {
      'ligamx': 'Liga MX',
      'premier': 'Premier League',
      'laliga': 'La Liga',
      'seriea': 'Serie A',
      'bundesliga': 'Bundesliga',
      'ligue1': 'Ligue 1'
    };
    
    res.json({
      success: true,
      liga: ligasNombres[liga],
      total: notificaciones.length,
      actualizado: new Date().toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City' 
      }),
      logo: "https://ultragol-l3ho.com.mx/attached_assets/1001721720-removebg-preview_1759201879566.png",
      notificaciones: notificaciones
    });
  } catch (error) {
    console.error("Error en /notificaciones/:liga:", error.message);
    res.status(500).json({ 
      success: false,
      error: "No se pudieron generar las notificaciones",
      detalles: error.message 
    });
  }
});

const blockedAdDomains = [
  'doubleclick.net', 'googlesyndication.com', 'adservice.google.com',
  'googleadservices.com', 'pagead2.googlesyndication.com', 'adnxs.com',
  'adsrvr.org', 'facebook.com/tr', 'amazon-adsystem.com', 'taboola.com',
  'outbrain.com', 'criteo.com', 'rubiconproject.com', 'pubmatic.com',
  'openx.net', 'casalemedia.com', 'advertising.com', 'bidswitch.net',
  'exelator.com', 'mathtag.com', 'serving-sys.com', 'flashtalking.com',
  'popads.net', 'popcash.net', 'propellerads.com', 'exoclick.com',
  'trafficjunky.com', 'juicyads.com', 'clickadu.com', 'hilltopads.net',
  'adcash.com', 'mgid.com', 'revcontent.com', 'content.ad', 'zergnet.com',
  'adsterra.com', 'admaven.io', 'a-ads.com', 'cointraffic.io'
];

const allowedStreamDomains = [
  'bolaloca.my', 'outfitreferee.net', 'glzdeportes.com', 'rereyano.ru',
  'embedme.top', 'embedsports.me', 'cricfree.io', 'sportzone.live'
];

function isBlockedDomain(url) {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return blockedAdDomains.some(domain => urlLower.includes(domain));
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function getBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

function filterM3u8Content(content, baseUrl, proxyBaseUrl) {
  const lines = content.split('\n');
  const filtered = [];
  let skipNext = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.toLowerCase().includes('ad-') || 
        trimmed.toLowerCase().includes('/ads/') ||
        trimmed.toLowerCase().includes('advertisement') ||
        isBlockedDomain(trimmed)) {
      skipNext = true;
      continue;
    }

    if (skipNext && !trimmed.startsWith('#')) {
      skipNext = false;
      continue;
    }

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
      filtered.push(`${proxyBaseUrl}/ultragol-l3ho?get=${encodeURIComponent(fullUrl)}`);
    } else {
      filtered.push(line);
    }
  }

  return filtered.join('\n');
}

app.get("/ultragol-l3ho", (req, res) => {
  const targetUrl = req.query.get;
  
  console.log(`🛡️ Ultragol-l3ho Proxy solicitado para: ${targetUrl || '(sin URL)'}`);
  
  // Generar HTML del reproductor
  const generatePlayerHtml = (url) => {
    if (!url || url.trim() === '') {
      return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canal no disponible - L3HO Interactive</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background-color: black;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
    }
    .logo {
      width: 150px;
      max-width: 80%;
      margin-bottom: 20px;
    }
    h2 {
      color: red;
      margin: 10px 0;
      font-size: 1.5em;
    }
    .contact {
      color: #aaaaaa;
      font-size: 0.9em;
      margin-top: 15px;
    }
    .email {
      color: #4da6ff;
      text-decoration: none;
    }
    .email:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/attached_assets/1001854641-removebg-preview_1764572556092.png" alt="L3HO Interactive" class="logo">
    <h2>Canal no disponible.</h2>
    <p class="contact">En caso de que detecte problemas<br>Contacte a este correo: <a href="mailto:servidorl3ho@gmail.com" class="email">servidorl3ho@gmail.com</a></p>
  </div>
</body>
</html>`;
    }
    
    // Decodificar URL si viene codificada
    let decodedUrl = url;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      decodedUrl = url;
    }
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>Reproductor de Video Sin Publicidad - ULTRAGOL</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background-color: black;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    #videoPlayer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background-color: black;
    }

    #logo-link {
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 1000;
      text-decoration: none;
    }

    #logo {
      width: 80px;
      max-width: 15vw;
      height: auto;
      opacity: 0.25;
      transition: opacity 0.3s ease, transform 0.2s ease;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
    }

    #logo:hover {
      opacity: 0.55;
      transform: scale(1.05);
    }

    @media (max-width: 600px) {
      #logo {
        width: 55px;
        max-width: 12vw;
      }
      #logo-link {
        top: 5px;
        right: 5px;
      }
    }

    @media (max-width: 400px) {
      #logo {
        width: 40px;
      }
    }
  </style>
</head>
<body>
  <a href="https://ultragol-l3ho.com.mx/index2.html" target="_blank" id="logo-link">
    <img src="/attached_assets/1001854642-removebg-preview_1764574041344.png" alt="ULTRAGOL" id="logo">
  </a>
  <div id="videoPlayer"></div>

  <script>
    // Obtener el valor del parámetro get= (igual que cmrroto01)
    const params = new URLSearchParams(window.location.search);
    const url = params.get("get");

    // Validar y cargar el iframe si existe la URL
    if (url) {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.allowFullscreen = true;
      iframe.sandbox = "allow-same-origin allow-scripts";
      document.getElementById('videoPlayer').appendChild(iframe);
    } else {
      document.getElementById('videoPlayer').innerHTML = "<h2 style='color:red;text-align:center;'>Canal no disponible.</h2>";
    }
  </script>
</body>
</html>`;
  };
  

  const html = generatePlayerHtml(targetUrl);
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.send(html);
  
  console.log(`✅ Ultragol-l3ho Proxy completado para: ${targetUrl || '(sin URL)'}`);
});

app.get("/api/l3ho-links", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  
  try {
    const cacheKey = "l3ho_links_api";
    let cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log("💾 Usando cache para L3HO Links");
      return res.json(cachedData);
    }

    console.log("📡 Recopilando todos los links de transmisiones...");

    const EXT_PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const localProxy = (url) => {
      if (!url) return null;
      // Si ya trae el proxy externo, extrae la URL cruda y aplica el local
      const raw = url.startsWith(EXT_PROXY)
        ? decodeURIComponent(url.slice(EXT_PROXY.length))
        : url;
      return `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(raw)}`;
    };
    
    const [trans1, trans2, trans3, trans4, trans5, trans6] = await Promise.all([
      scrapTransmisiones().catch(err => { console.error("Error trans1:", err.message); return null; }),
      scrapTransmisiones2().catch(err => { console.error("Error trans2:", err.message); return null; }),
      scrapTransmisiones3().catch(err => { console.error("Error trans3:", err.message); return null; }),
      scrapTransmisiones4().catch(err => { console.error("Error trans4:", err.message); return null; }),
      scrapTransmisiones5().catch(err => { console.error("Error trans5:", err.message); return null; }),
      scrapTransmisiones6().catch(err => { console.error("Error trans6:", err.message); return null; })
    ]);
    
    const allLinks = [];
    const seenKeys = new Set();
    
    const addLink = (name, url, source, logo1 = null, logo2 = null, deporte = null, estado = null, hora = null) => {
      if (!url || !name) return;
      const cleanUrl = url.trim();
      const cleanName = name.trim();
      // Deduplicate by name+url so generic shared player URLs don't block different events
      const key = cleanName + '|' + cleanUrl;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      allLinks.push({
        name: cleanName,
        url: cleanUrl,
        source: source,
        logo1: logo1 || null,
        logo2: logo2 || null,
        deporte: deporte || null,
        estado: estado || null,
        hora: hora || null
      });
    };
    
    if (trans1 && trans1.transmisiones) {
      trans1.transmisiones.forEach(t => {
        if (t.canales && Array.isArray(t.canales)) {
          t.canales.forEach(canal => {
            const nombre = `${t.evento} - ${canal.nombre}`;
            // canal.url directo (estructura real del scraper)
            if (canal.url) {
              addLink(nombre, localProxy(canal.url), "Rereyano", t.logo1, t.logo2, t.deporte, t.estado, t.hora);
            } else if (canal.links) {
              if (canal.links.principal) addLink(nombre, localProxy(canal.links.principal), "Rereyano", t.logo1, t.logo2, t.deporte, t.estado, t.hora);
              if (canal.links.backup) addLink(nombre + " (Backup)", localProxy(canal.links.backup), "Rereyano", t.logo1, t.logo2, t.deporte, t.estado, t.hora);
            }
          });
        }
      });
    }
    
    if (trans2 && trans2.transmisiones) {
      trans2.transmisiones.forEach(t => {
        // Los canales de skylivehd tienen m3u8 dentro de t.canales[]
        if (t.canales && Array.isArray(t.canales)) {
          t.canales.forEach((canal, i) => {
            const nombre = t.evento || t.titulo || t.liga || "Transmision";
            const url = canal.m3u8 || canal.m3u8Direct || canal.url || null;
            if (url) addLink(`${nombre}${t.canales.length > 1 ? ` - ${canal.nombre || i + 1}` : ""}`, url, "StreamCenter", null, null, t.deporte, t.estado, t.hora);
          });
        } else if (t.url) {
          const nombre = t.evento || t.titulo || t.liga || "Transmision";
          addLink(nombre, t.url, "StreamCenter", null, null, t.deporte, t.estado, t.hora);
        }
      });
    }
    
    if (trans3 && trans3.transmisiones) {
      trans3.transmisiones.forEach(t => {
        // Los items de tvtvhd tienen m3u8 directo
        if (t.m3u8) {
          const nombre = t.titulo || t.canal || t.evento || "Transmision";
          addLink(nombre, localProxy(t.m3u8), "E1Link", null, null, t.liga || null, null, t.hora);
        } else if (t.enlacesDetalle && Array.isArray(t.enlacesDetalle)) {
          t.enlacesDetalle.forEach((enlace, i) => {
            const base = t.titulo || t.evento || t.canal || "Transmision";
            const nombre = `${base} - ${enlace.nombre || `Opcion ${i + 1}`}`;
            const rawUrl = enlace.urlProxy || enlace.url;
            addLink(nombre, localProxy(rawUrl), "E1Link", null, null, null, null, t.hora);
          });
        }
      });
    }
    
    if (trans4 && trans4.transmisiones) {
      trans4.transmisiones.forEach(t => {
        if (t.enlace || t.url) {
          const nombre = t.evento || t.equipos || t.canal || "Transmision";
          addLink(nombre, t.enlace || t.url, "SportOnline", t.logo1, t.logo2, t.deporte || t.pais, t.estado, t.hora);
        }
        if (t.canales && Array.isArray(t.canales)) {
          t.canales.forEach(canal => {
            if (canal.enlace || canal.url) {
              const nombre = `${t.evento || t.equipos || "Transmision"} - ${canal.nombre || canal.canal || "Canal"}`;
              addLink(nombre, canal.enlace || canal.url, "SportOnline", t.logo1, t.logo2, t.deporte || t.pais, t.estado, t.hora);
            }
          });
        }
      });
    }
    
    if (trans5 && trans5.matches) {
      trans5.matches.forEach(match => {
        if (match.links && Array.isArray(match.links)) {
          match.links.forEach(linkGroup => {
            if (linkGroup.data) {
              if (Array.isArray(linkGroup.data)) {
                linkGroup.data.forEach((link, i) => {
                  if (typeof link === 'string') {
                    const nombre = `${match.title || "Transmision"} - ${linkGroup.type || ""} ${i + 1}`;
                    addLink(nombre, link, "DonRomans", null, null, match.league, null, match.hour);
                  } else if (link && link.match_url) {
                    const nombre = `${match.title || "Transmision"} - ${link.stream_source || linkGroup.type || ""} ${i + 1}`;
                    addLink(nombre, link.match_url, "DonRomans", null, null, match.league, null, match.hour);
                  } else if (link && link.url) {
                    const nombre = `${match.title || "Transmision"} - ${link.name || linkGroup.type || ""} ${i + 1}`;
                    addLink(nombre, link.url, "DonRomans", null, null, match.league, null, match.hour);
                  } else if (link && typeof link === 'object') {
                    Object.values(link).forEach((v, j) => {
                      if (typeof v === 'string' && v.startsWith('http')) {
                        const nombre = `${match.title || "Transmision"} - ${linkGroup.type || ""} ${i + 1}.${j + 1}`;
                        addLink(nombre, v, "DonRomans", null, null, match.league, null, match.hour);
                      }
                    });
                  }
                });
              } else if (typeof linkGroup.data === 'object') {
                Object.entries(linkGroup.data).forEach(([key, value]) => {
                  if (typeof value === 'string' && value.startsWith('http')) {
                    const nombre = `${match.title || "Transmision"} - ${key}`;
                    addLink(nombre, value, "DonRomans", null, null, match.league, null, match.hour);
                  } else if (Array.isArray(value)) {
                    value.forEach((v, i) => {
                      if (typeof v === 'string' && v.startsWith('http')) {
                        const nombre = `${match.title || "Transmision"} - ${key} ${i + 1}`;
                        addLink(nombre, v, "DonRomans", null, null, match.league, null, match.hour);
                      }
                    });
                  }
                });
              }
            }
          });
        }
      });
    }

    if (trans6 && trans6.transmisiones) {
      trans6.transmisiones.forEach(t => {
        if (t.fuentes && Array.isArray(t.fuentes)) {
          t.fuentes.forEach((fuente, i) => {
            if (fuente.url) {
              const nombre = `${t.titulo || t.evento || "Transmision"} - ${fuente.fuente || `Fuente ${i + 1}`}`;
              addLink(nombre, fuente.url, "StreamedPK", null, null, t.deporte, t.estado, t.hora);
            }
          });
        }
      });
    }
    
    allLinks.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    
    console.log(`✅ L3HO Links: ${allLinks.length} links unicos recopilados`);
    
    const responseData = {
      success: true,
      total: allLinks.length,
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      links: allLinks
    };
    
    cache.set(cacheKey, responseData, 60 * 5); // Cache por 5 minutos
    res.json(responseData);
  } catch (error) {
    console.error("Error en /api/l3ho-links:", error.message);
    res.status(500).json({ 
      success: false,
      error: "No se pudieron obtener los links",
      detalles: error.message 
    });
  }
});

// ============================================
// ENDPOINTS DE ESTADISTICAS EN TIEMPO REAL
// ============================================

// Estadísticas Liga MX
app.get("/estadisticas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de Liga MX...");
    const data = await scrapEstadisticasLigaMX(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /estadisticas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas Premier League
app.get("/premier/estadisticas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de Premier League...");
    const data = await scrapEstadisticasPremier(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/estadisticas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas La Liga
app.get("/laliga/estadisticas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de La Liga...");
    const data = await scrapEstadisticasLaLiga(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/estadisticas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas Serie A
app.get("/seriea/estadisticas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de Serie A...");
    const data = await scrapEstadisticasSerieA(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/estadisticas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas Bundesliga
app.get("/bundesliga/estadisticas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de Bundesliga...");
    const data = await scrapEstadisticasBundesliga(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/estadisticas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas Ligue 1
app.get("/ligue1/estadisticas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de Ligue 1...");
    const data = await scrapEstadisticasLigue1(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/estadisticas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas de TODAS las ligas
app.get("/estadisticas/todas-las-ligas", async (req, res) => {
  try {
    const { date } = req.query;
    console.log("📊 Obteniendo estadísticas de TODAS las ligas...");
    const data = await scrapEstadisticasTodasLasLigas(date);
    res.json(data);
  } catch (error) {
    console.error("Error en /estadisticas/todas-las-ligas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas",
      detalles: error.message 
    });
  }
});

// Estadísticas de un partido específico
app.get("/estadisticas/partido/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`📊 Obteniendo estadísticas del partido ${eventId}...`);
    const data = await scrapEstadisticasPartido(eventId);
    res.json(data);
  } catch (error) {
    console.error(`Error en /estadisticas/partido/${req.params.eventId}:`, error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las estadísticas del partido",
      detalles: error.message 
    });
  }
});

// ====== NUEVO ENDPOINT: TODO TODAS LAS LIGAS ======
// Endpoint principal que retorna TODA la información de TODAS las ligas del mundo
app.get("/todo-todas-las-ligas", async (req, res) => {
  try {
    const { categoria } = req.query;
    console.log(`🌍 Obteniendo TODO de TODAS las ligas del mundo${categoria ? ` (categoría: ${categoria})` : ''}...`);
    const data = await scrapTodasLasLigasDataFactory(categoria);
    res.json(data);
  } catch (error) {
    console.error("Error en /todo-todas-las-ligas:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los datos de todas las ligas",
      detalles: error.message 
    });
  }
});

// Endpoint para obtener datos de una liga específica por código
app.get("/datafactory/:liga", async (req, res) => {
  try {
    const { liga } = req.params;
    console.log(`⚽ Obteniendo datos de la liga: ${liga}...`);
    const data = await scrapDataFactoryLiga(liga);
    res.json(data);
  } catch (error) {
    console.error(`Error en /datafactory/${req.params.liga}:`, error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los datos de la liga",
      detalles: error.message 
    });
  }
});

// Endpoint para listar todas las ligas disponibles
app.get("/ligas-disponibles", (req, res) => {
  const ligasDisponibles = Object.entries(ESPN_LEAGUE_IDS).map(([codigo, info]) => ({
    codigo,
    nombre: info.name,
    pais: info.country,
    endpoint: `/datafactory/${codigo}`,
    leagueId: info.id
  }));
  
  const categorias = Object.entries(CATEGORIAS_LIGAS).map(([cat, codigos]) => ({
    categoria: cat,
    ligas: codigos.length,
    endpoint: `/todo-todas-las-ligas?categoria=${cat}`
  }));
  
  res.json({
    totalLigas: Object.keys(ESPN_LEAGUE_IDS).length,
    totalCategorias: Object.keys(CATEGORIAS_LIGAS).length,
    endpoints: {
      todasLasLigas: "/todo-todas-las-ligas",
      porCategoria: "/todo-todas-las-ligas?categoria=CATEGORIA",
      ligaEspecifica: "/datafactory/:codigo"
    },
    categorias,
    ligas: ligasDisponibles,
    actualizacion: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
  });
});

// Endpoint: extraer m3u8 directo de unlimplay por TMDB movie ID
app.get('/api/unlimplay/m3u8/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const force = req.query.force === '1' || req.query.force === 'true';
    const data = await scrapUnlimplayM3u8(movieId, force);
    const base = `${req.protocol}://${req.get('host')}`;

    const makeAbsolute = (u) => u && u.startsWith('/') ? base + u : u;
    const processData = JSON.parse(JSON.stringify(data));
    for (const info of Object.values(processData.idiomas || {})) {
      info.servidores = (info.servidores || []).map(s => {
        if (s.tipo === 'm3u8_directo') {
          const url = s.m3u8_proxied
            ? makeAbsolute(s.m3u8_proxied)
            : s.url ? `${base}/servpeli-stream?url=${encodeURIComponent(s.url)}` : null;
          const m3u8 = s.m3u8 || s.url || null;
          return { nombre: s.nombre, tipo: 'direct', url, m3u8 };
        }
        return { nombre: s.nombre, tipo: 'embed', url: s.url || null };
      });
      delete info.m3u8;
      delete info.m3u8_proxied;
      delete info.proxy_stream;
      delete info.embed_url;
      delete info.player_url;
    }

    res.json(processData);
  } catch (err) {
    console.error('[unlimplay/m3u8] Error:', err.message);
    res.status(502).json({ error: 'No se pudo obtener el m3u8', detalle: err.message });
  }
});

// Página player HLS embebible
app.get('/player', (req, res) => {
  const { url, title } = req.query;
  if (!url) return res.status(400).send('Parámetro ?url= requerido');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title ? title.replace(/</g,'&lt;') : 'Player'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
  video { width:100%; max-width:960px; max-height:90vh; background:#000; }
  #error { color:#ff4444; padding:20px; text-align:center; display:none; }
  #loading { color:#aaa; padding:20px; text-align:center; }
</style>
</head>
<body>
<div id="loading">Cargando stream...</div>
<video id="video" controls autoplay playsinline></video>
<div id="error"></div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js"></script>
<script>
const src = ${JSON.stringify(url)};
const video = document.getElementById('video');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
function showError(msg) {
  loading.style.display = 'none';
  errorDiv.style.display = 'block';
  errorDiv.textContent = 'Error: ' + msg;
}
if (Hls.isSupported()) {
  const hls = new Hls({ enableWorker: false });
  hls.loadSource(src);
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, () => { loading.style.display='none'; video.play().catch(()=>{}); });
  hls.on(Hls.Events.ERROR, (e, data) => { if (data.fatal) showError(data.details); });
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = src;
  video.addEventListener('loadedmetadata', () => { loading.style.display='none'; video.play().catch(()=>{}); });
  video.addEventListener('error', () => showError('No se pudo cargar el stream'));
} else {
  showError('Tu navegador no soporta HLS. Usa VLC u otro reproductor con la URL m3u8.');
}
</script>
</body>
</html>`);
});

// Endpoint: extraer m3u8 directo de cualquier URL embed (vidhide, filemoon, etc.)
// GET /api/embed/m3u8?url=https://vidhidepro.com/v/xxx&referer=https://unlimplay.com/
app.get('/api/embed/m3u8', async (req, res) => {
  const { url, referer, nombre } = req.query;
  if (!url) return res.status(400).json({ error: 'Parámetro ?url= requerido' });
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const makeAbsolute = (u) => u && u.startsWith('/') ? base + u : u;
    const result = await extractM3u8FromEmbed(url, referer || 'https://unlimplay.com/');
    if (result.ok) {
      return res.json({ nombre: nombre || 'embed', tipo: 'direct', url: makeAbsolute(result.m3u8_proxied) });
    }
    return res.status(422).json({ nombre: nombre || 'embed', tipo: 'embed', url: null, error: result.error });
  } catch (err) {
    console.error('[embed/m3u8] Error:', err.message);
    res.status(502).json({ error: 'Error al extraer m3u8', detalle: err.message });
  }
});

// Endpoint: m3u8 de un episodio de serie desde Unlimplay
app.get('/api/unlimplay/m3u8/tv/:seriesId/:season/:episode', async (req, res) => {
  try {
    const { seriesId, season, episode } = req.params;
    const force = req.query.force === '1' || req.query.force === 'true';
    const data = await scrapUnlimplayM3u8Tv(seriesId, season, episode, force);
    const base = `${req.protocol}://${req.get('host')}`;

    const makeAbsolute = (u) => u && u.startsWith('/') ? base + u : u;
    const processData = JSON.parse(JSON.stringify(data));
    for (const info of Object.values(processData.idiomas || {})) {
      info.servidores = (info.servidores || []).map(s => {
        if (s.tipo === 'm3u8_directo') {
          const url = s.m3u8_proxied
            ? makeAbsolute(s.m3u8_proxied)
            : s.url ? `${base}/servpeli-stream?url=${encodeURIComponent(s.url)}` : null;
          const m3u8 = s.m3u8 || s.url || null;
          return { nombre: s.nombre, tipo: 'direct', url, m3u8 };
        }
        return { nombre: s.nombre, tipo: 'embed', url: s.url || null };
      });
      delete info.m3u8;
      delete info.m3u8_proxied;
      delete info.proxy_stream;
      delete info.embed_url;
      delete info.player_url;
    }

    res.json(processData);
  } catch (err) {
    console.error('[unlimplay/m3u8/tv] Error:', err.message);
    res.status(502).json({ error: 'No se pudo obtener el m3u8 del episodio', detalle: err.message });
  }
});

// Endpoint: m3u8 de todos los servidores de un episodio en paralelo
app.get('/api/unlimplay/m3u8-all/tv/:seriesId/:season/:episode', async (req, res) => {
  try {
    const { seriesId, season, episode } = req.params;
    const force = req.query.force === '1' || req.query.force === 'true';
    const base = `${req.protocol}://${req.get('host')}`;
    const makeAbsolute = (u) => u && u.startsWith('/') ? base + u : u;

    // scrapUnlimplayM3u8Tv ya resuelve todos los servidores internamente
    const data = await scrapUnlimplayM3u8Tv(seriesId, season, episode, force);

    const idiomasResueltos = {};
    for (const [idioma, info] of Object.entries(data.idiomas || {})) {
      idiomasResueltos[idioma] = {
        servidores: (info.servidores || []).map(s => {
          if (s.tipo === 'm3u8_directo') {
            const url = s.m3u8_proxied
              ? makeAbsolute(s.m3u8_proxied)
              : s.url ? `${base}/servpeli-stream?url=${encodeURIComponent(s.url)}` : null;
            return { nombre: s.nombre, tipo: 'direct', url, m3u8: s.m3u8 || s.url || null };
          }
          return { nombre: s.nombre, tipo: 'embed', url: s.url || null };
        })
      };
    }

    res.json({
      series_id: data.series_id,
      season: data.season,
      episode: data.episode,
      tipo: data.tipo,
      idiomas: idiomasResueltos
    });
  } catch (err) {
    console.error('[unlimplay/m3u8-all/tv] Error:', err.message);
    res.status(502).json({ error: 'No se pudo obtener el m3u8 del episodio', detalle: err.message });
  }
});

// Endpoint: extraer m3u8 de todos los servidores de una película en paralelo
app.get('/api/unlimplay/m3u8-all/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const force = req.query.force === '1' || req.query.force === 'true';
    const base = `${req.protocol}://${req.get('host')}`;
    const makeAbsolute = (u) => u && u.startsWith('/') ? base + u : u;

    // scrapUnlimplayM3u8 ya resuelve todos los servidores internamente
    const data = await scrapUnlimplayM3u8(movieId, force);

    const idiomasResueltos = {};
    for (const [idioma, info] of Object.entries(data.idiomas || {})) {
      idiomasResueltos[idioma] = {
        servidores: (info.servidores || []).map(s => {
          if (s.tipo === 'm3u8_directo') {
            const url = s.m3u8_proxied
              ? makeAbsolute(s.m3u8_proxied)
              : s.url ? `${base}/servpeli-stream?url=${encodeURIComponent(s.url)}` : null;
            return { nombre: s.nombre, tipo: 'direct', url, m3u8: s.m3u8 || s.url || null };
          }
          return { nombre: s.nombre, tipo: 'embed', url: s.url || null };
        })
      };
    }

    res.json({ movie_id: data.movie_id, fuente: data.fuente, idiomas: idiomasResueltos });
  } catch (err) {
    console.error('[unlimplay/m3u8-all] Error:', err.message);
    res.status(502).json({ error: 'No se pudo obtener el m3u8', detalle: err.message });
  }
});

app.get('/servpeli', (req, res) => {
  req.params = { 0: '' };
  return proxyServpeli(req, res);
});

app.all('/servpeli/*', (req, res) => {
  req.params[0] = req.params[0] || '';
  return proxyServpeli(req, res);
});

app.get('/servpeli-stream', (req, res) => {
  return proxyServpeliStream(req, res);
});

app.all('/cdn-cgi/*', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.status(200).send('/* blocked */');
});

updateAllData();
updateMarcadores();

cron.schedule("*/20 * * * *", () => {
  console.log("⏰ Actualización programada iniciada");
  updateAllData();
});

cron.schedule("*/5 * * * *", () => {
  console.log("⚽ Actualización de marcadores programada (cada 5 min)");
  updateMarcadores();
});

cron.schedule("*/15 * * * *", () => {
  console.log("⚽ Limpiando caché de alineaciones (cada 15 min)");
  const cacheKeys = ['alineaciones_ligamx_hoy', 'alineaciones_premier_hoy', 'alineaciones_laliga_hoy', 
                     'alineaciones_seriea_hoy', 'alineaciones_bundesliga_hoy', 'alineaciones_ligue1_hoy'];
  cacheKeys.forEach(key => cache.clear(key));
  console.log("💡 Las alineaciones se actualizarán en la próxima solicitud");
});

cron.schedule("0 */6 * * *", () => {
  console.log("🧹 Limpiando caché de fotos de jugadores (cada 6 horas)");
  clearPhotoCache();
  const stats = getPhotoStats();
  console.log(`📊 Métricas de fotos: ${stats.totalRequests} solicitudes, ${stats.cacheHitRate} cache hit rate`);
});

// Refresh automático de m3u8 de Unlimplay cada 2 horas para que los tokens no expiren
cron.schedule("0 */2 * * *", async () => {
  console.log("🎬 [unlimplay] Iniciando refresh automático de caché (cada 2h)...");
  try {
    await refreshUnlimplayCache();
  } catch (e) {
    console.error("❌ [unlimplay] Error en refresh automático:", e.message);
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Multi-League Football API activa en puerto ${PORT}`);
  console.log(`📡 Actualizaciones automáticas cada 20 minutos`);
  console.log(`⚽ Ligas disponibles: Liga MX, Premier League, La Liga, Serie A, Bundesliga, Ligue 1`);
  console.log(`🔗 Accede a "/" para ver todos los endpoints disponibles`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`⚠️  Puerto ${PORT} ocupado. Reintentando en 3s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT, "0.0.0.0");
    }, 3000);
  } else {
    throw err;
  }
});

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

const { scrapTransmisiones } = require("./src/scrapers/transmisiones");
const { scrapTransmisiones2 } = require("./src/scrapers/transmisiones2");
const { scrapTransmisiones3 } = require("./src/scrapers/transmisiones3");
const { scrapTransmisiones4 } = require("./src/scrapers/transmisiones4");
const { scrapTransmisiones5 } = require("./src/scrapers/transmisiones5");
const { scrapTransmisiones6 } = require("./src/scrapers/transmisiones6");
const { scrapTransmisiones7 } = require("./src/scrapers/transmisiones7");
const { scrapTransmisiones8 } = require("./src/scrapers/transmisiones8");
const { 
  scrapCanales, 
  scrapCanalesPorPais, 
  scrapCanalesPorCategoria, 
  scrapCanalesDeportes,
  scrapCanalesPremium
} = require("./src/scrapers/canales");

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
const { sessionConfig, securityHeaders, apiLimiter } = require("./src/middleware/auth");
const adminKeysRouter = require("./src/routes/adminKeys");
const app = express();

app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);
app.use(apiLimiter);

app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use('/api-admin', adminKeysRouter);

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

app.get("/l3ho-links", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'l3ho-links.html'));
});

app.get("/embed/l3ho-links", (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
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
      transmisiones7: {
        endpoint: "/transmisiones7",
        descripcion: "Agenda deportiva de futbollibretv.su - Partidos con nombre completo, liga, equipos, hora y canales con links decodificados listos para reproducir"
      },
      transmisiones8: {
        endpoint: "/transmisiones8",
        descripcion: "Transmisiones deportivas de golxu.com - Combina agenda propia con eventos destacados (fútbol, F1, etc.) y matches en vivo/próximos de streamed.pk. Incluye logos, hora, opciones de canal y estado del partido"
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

app.get("/transmisiones4", async (req, res) => {
  try {
    let data = cache.get("transmisiones4");
    if (!data) {
      data = await scrapTransmisiones4();
      cache.set("transmisiones4", data, 600); // Cache por 10 minutos
    }
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    function applyStream7Proxy(obj) {
      if (typeof obj === "string") {
        if (/^https?:\/\//i.test(obj)) {
          return `${baseUrl}/stream7?url=${encodeURIComponent(obj)}`;
        }
        return obj;
      }
      if (Array.isArray(obj)) return obj.map(applyStream7Proxy);
      if (obj && typeof obj === "object") {
        const result = {};
        for (const key of Object.keys(obj)) result[key] = applyStream7Proxy(obj[key]);
        return result;
      }
      return obj;
    }
    res.json(encodeLinks(applyStream7Proxy(data)));
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return `${baseUrl}/stream7?url=${encodeURIComponent(obj)}`;
    }
    // Caso 2: URL directa de streams.center
    if (/^https?:\/\/(www\.)?streams\.center/i.test(obj)) {
      return `${baseUrl}/stream7?url=${encodeURIComponent(obj)}`;
    }
    // Caso 3: URL envuelta en GLZ_PROXY externo (ultragol-l3ho?get=...)
    const glzMatch = obj.match(/ultragol-l3ho\?get=(.+)/);
    if (glzMatch) {
      try {
        const inner = decodeURIComponent(glzMatch[1]);
        if (/^https?:\/\/(www\.)?bolaloca\.my/i.test(inner)) {
          return `${baseUrl}/stream7?url=${encodeURIComponent(inner)}`;
        }
        if (/^https?:\/\/(www\.)?streams\.center/i.test(inner)) {
          return `${baseUrl}/stream7?url=${encodeURIComponent(inner)}`;
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

app.get("/transmisiones", async (req, res) => {
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
          const baseUrl = `${req.protocol}://${req.get("host")}`;
          return res.json({ ...encodeLinks(applyBolalocoProxy(staleData, baseUrl)), _stale: true });
        }
        throw fetchError;
      }
    }
    
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
  } catch (error) {
    console.error("Error en /transmisiones:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas",
      detalles: error.message 
    });
  }
});

app.get("/transmisiones2", async (req, res) => {
  try {
    let data = cache.get("transmisiones2");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones deportivas desde dp.mycraft.click (caché vacío)...");
      try {
        data = await scrapTransmisiones2();
        
        if (data && data.total > 0) {
          cache.set("transmisiones2", data);
        } else if (data && data.error) {
          const staleData = cache.getStale("transmisiones2");
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
        const staleData = cache.getStale("transmisiones2");
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
    res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
  } catch (error) {
    console.error("Error en /transmisiones2:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde dp.mycraft.click",
      detalles: error.message,
      sugerencia: "El sitio web puede estar bloqueando las peticiones. Intenta de nuevo más tarde o considera usar un proxy."
    });
  }
});

app.get("/transmisiones3", async (req, res) => {
  try {
    let data = cache.get("transmisiones3");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones deportivas desde e1link.link (caché vacío)...");
      try {
        data = await scrapTransmisiones3();
        
        if (data && data.total > 0) {
          cache.set("transmisiones3", data);
        } else if (data && data.error) {
          const staleData = cache.getStale("transmisiones3");
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
        const staleData = cache.getStale("transmisiones3");
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
    const proxied = {
      ...data,
      transmisiones: (data.transmisiones || []).map(t => ({
        ...t,
        enlacesDetalle: (t.enlacesDetalle || []).map(e => ({
          ...e,
          url: `${baseUrl}/stream7?url=${encodeURIComponent(e.url)}`
        }))
      }))
    };
    res.json(proxied);
  } catch (error) {
    console.error("Error en /transmisiones3:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde tvtvhd.com",
      detalles: error.message,
      sugerencia: "El sitio web puede estar bloqueando las peticiones. Intenta de nuevo más tarde."
    });
  }
});

app.get("/transmisiones4", async (req, res) => {
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
    res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
  } catch (error) {
    console.error("Error en /transmisiones4:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde ftvhd.com",
      detalles: error.message,
      sugerencia: "El sitio web puede estar bloqueando las peticiones. Intenta de nuevo más tarde."
    });
  }
});

app.get("/transmisiones5", async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  try {
    let data = cache.get("transmisiones5");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones EN TIEMPO REAL desde donromans.com API (caché vacío)...");
      try {
        data = await scrapTransmisiones5();
        
        if (data && data.success && data.totalMatches > 0) {
          cache.set("transmisiones5", data, 300);
          return res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
        } else if (data && !data.success) {
          const staleData = cache.getStale("transmisiones5");
          if (staleData && staleData.success && staleData.totalMatches > 0) {
            console.log("⚠️ Usando datos en caché (expirados) debido a error en la API");
            data = {
              ...staleData,
              advertencia: "Datos del caché (pueden no estar actualizados). Error al obtener datos nuevos de la API.",
              ultimaActualizacion: staleData.timestamp
            };
            return res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
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
          return res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
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
    
    res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
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

app.get("/transmisiones6", async (req, res) => {
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
    res.json(encodeLinks(applyBolalocoProxy(data, baseUrl)));
  } catch (error) {
    console.error("Error en /transmisiones6:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde UltraGol API",
      detalles: error.message,
      sugerencia: "El sitio web podría estar bloqueando las peticiones o Cloudflare está activo. Intenta de nuevo más tarde."
    });
  }
});

app.get("/transmisiones7", async (req, res) => {
  try {
    let data = cache.get("transmisiones7");

    if (!data) {
      console.log("📺 Obteniendo transmisiones desde futbollibretv.su/agenda/ - caché vacío...");
      try {
        data = await scrapTransmisiones7();
        cache.set("transmisiones7", data, 600);
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones7");
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
    const dataConProxy = {
      ...data,
      transmisiones: (data.transmisiones || []).map(t => ({
        ...t,
        canales: (t.canales || []).map(c => ({
          canal: c.canal,
          calidad: c.calidad,
          urlStream: `${baseUrl}/stream7?url=${encodeURIComponent(c.url)}`
        }))
      }))
    };

    res.json(encodeLinks(dataConProxy));
  } catch (error) {
    console.error("Error en /transmisiones7:", error.message);
    res.status(500).json({
      error: "No se pudieron obtener las transmisiones desde futbollibretv.su",
      detalles: error.message
    });
  }
});

app.get("/transmisiones8", async (req, res) => {
  try {
    let data = cache.get("transmisiones8");

    if (!data) {
      console.log("📺 Obteniendo transmisiones desde golxu.com - caché vacío...");
      try {
        data = await scrapTransmisiones8();
        if (data && data.total > 0) {
          cache.set("transmisiones8", data, 600);
        }
      } catch (scrapeError) {
        const staleData = cache.getStale("transmisiones8");
        if (staleData && staleData.total > 0) {
          data = {
            ...staleData,
            advertencia: "Datos del caché (pueden no estar actualizados). Error: " + scrapeError.message,
            ultimaActualizacion: staleData.actualizado
          };
        } else {
          throw scrapeError;
        }
      }
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const dataConProxy = {
      ...data,
      transmisiones: (data.transmisiones || []).map(t => ({
        ...t,
        opciones: (t.opciones || []).map(op => ({
          ...op,
          url: `${baseUrl}/ultragol-l3ho?get=${encodeURIComponent(op.url)}`
        }))
      }))
    };

    res.json(encodeLinks(dataConProxy));
  } catch (error) {
    console.error("Error en /transmisiones8:", error.message);
    res.status(500).json({
      error: "No se pudieron obtener las transmisiones desde golxu.com",
      detalles: error.message
    });
  }
});

const STREAM7_REFERER = "https://futbollibretv.su/";
const STREAM7_ALLOWED = [
  "latamvidz1.com", "esvideofy.com", "envivoslatam.org", "ng0pr.envivoslatam.org",
  "zohanayaan.com", "hoca6.com", "83870203.net", "12703830.net", "eveningbad.net",
  "streameasthd.net", "prospectivetoday.fun", "capo7play.com", "streamx550.com",
  "tvtvhd.com", "ftvhd.com", "pltvhd.com", "cdn.ftvhd.com",
  "fubohd.com",
  "streams.center", "mainstreams.pro"
];

function stream7IsAllowed(url) {
  try {
    const h = new URL(url).hostname;
    return STREAM7_ALLOWED.some(d => h === d || h.endsWith("." + d));
  } catch { return false; }
}

async function extractM3u8FromStreamsCenter(pageUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const origin = "https://streams.center";

  // Paso 1: ch*.php → extraer iframe con hls.php?stream=ID
  const chResp = await axios.get(pageUrl, {
    timeout: 15000,
    headers: { "User-Agent": UA, "Referer": "https://streamcenter.live/", "Accept": "text/html" }
  });
  const iframeMatch = chResp.data.match(/src=["']\/\/streams\.center\/embed\/(hls\.php\?stream=[^"'\s]+)["']/);
  if (!iframeMatch) throw new Error("No se encontró el iframe hls.php en streams.center");
  const hlsUrl = `https://streams.center/embed/${iframeMatch[1]}`;

  // Paso 2: hls.php → extraer input encriptado
  const hlsResp = await axios.get(hlsUrl, {
    timeout: 15000,
    headers: { "User-Agent": UA, "Referer": `${origin}/`, "Accept": "text/html" }
  });
  const inputMatch = hlsResp.data.match(/input:\s*["']([A-Za-z0-9+/=]+)["']/);
  if (!inputMatch) throw new Error("No se encontró el input encriptado en streams.center/hls.php");

  // Paso 3: POST decrypt.php → obtener m3u8
  const decryptResp = await axios.post(
    `${origin}/embed/decrypt.php`,
    new URLSearchParams({ input: inputMatch[1] }).toString(),
    {
      timeout: 15000,
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": hlsUrl,
        "Origin": origin
      }
    }
  );
  const m3u8Url = (decryptResp.data || "").trim();
  if (!m3u8Url || !m3u8Url.includes(".m3u8")) throw new Error("decrypt.php no devolvió un m3u8 válido");
  return { m3u8Url, referer: `${origin}/` };
}

async function extractM3u8FromTvtvhd(pageUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const resp = await axios.get(pageUrl, {
    timeout: 15000,
    headers: {
      "User-Agent": UA,
      "Referer": "https://tvtvhd.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  const html = resp.data;
  const match = html.match(/var\s+playbackURL\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
  if (!match) throw new Error("No se encontró playbackURL en tvtvhd.com");
  return { m3u8Url: match[1], referer: "https://tvtvhd.com/" };
}

async function extractM3u8FromStreamtpnew(pageUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const origin = new URL(pageUrl).origin;
  const resp = await axios.get(pageUrl, {
    timeout: 15000,
    headers: { "User-Agent": UA, "Referer": origin + "/" }
  });
  const html = resp.data;

  // Extraer todos los pares [k,"base64"] del array obfuscado
  const pairs = [...html.matchAll(/\[(\d+),"([A-Za-z0-9+/=]+)"\]/g)];
  if (!pairs.length) throw new Error("No se encontró el array de obfuscación en streamtpnew");

  // Extraer k: suma de las dos funciones que retornan números antes de var p2pConfig
  const p2pIdx = html.indexOf("var p2pConfig");
  const before = p2pIdx > 0 ? html.substring(0, p2pIdx) : html;
  const kMatches = [...before.matchAll(/function\s+\w+\(\)\{return\s+(\d+);\}/g)];
  if (kMatches.length < 2) throw new Error("No se pudo extraer k de streamtpnew");
  const k = parseInt(kMatches[kMatches.length - 2][1]) + parseInt(kMatches[kMatches.length - 1][1]);

  // Decodificar: sort por índice, luego String.fromCharCode(parseInt(atob(v).replace(/\D/g,'')) - k)
  const sorted = pairs.map(m => [parseInt(m[1]), m[2]]).sort((a, b) => a[0] - b[0]);
  let m3u8Url = "";
  for (const [ki, v] of sorted) {
    const decoded = Buffer.from(v, "base64").toString("latin1");
    const num = parseInt(decoded.replace(/\D/g, "")) - k;
    m3u8Url += String.fromCharCode(num);
  }

  if (!m3u8Url || !m3u8Url.includes(".m3u8")) {
    throw new Error("streamtpnew: m3u8 decodificado inválido: " + m3u8Url.substring(0, 80));
  }

  return { m3u8Url, referer: origin + "/" };
}

async function extractM3u8FromStreamvipx(pageUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const origin = new URL(pageUrl).origin;
  const resp = await axios.get(pageUrl, {
    timeout: 15000,
    headers: { "User-Agent": UA, "Referer": origin + "/" }
  });
  const html = resp.data;

  // El m3u8 está directo en el HTML
  const m = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/);
  if (!m) throw new Error("No se encontró m3u8 en streamvipx");

  return { m3u8Url: m[0], referer: origin + "/" };
}

async function extractM3u8FromCapo7play(pageUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  const origin = new URL(pageUrl).origin;
  const resp = await axios.get(pageUrl, {
    timeout: 15000,
    headers: { "User-Agent": UA, "Referer": origin + "/" }
  });
  const html = resp.data;

  // La URL del m3u8 está en un array de caracteres dentro de una función:
  // return(["h","t","t","p","s",...].join("") + varAleatoria.join("") + document.getElementById("idAleatorio").innerHTML)
  // La variable y el elemento son siempre cadenas vacías, así que solo necesitamos el array.
  const arrMatch = html.match(/return\s*\(\s*\[([^\]]+)\]\.join\(""\)/);
  if (!arrMatch) throw new Error("capo7play: no se encontró el array de caracteres del stream");

  const chars = [...arrMatch[1].matchAll(/"([^"]*)"/g)].map(m => m[1]);
  const m3u8Url = chars.join("").replace(/\\\//g, "/");

  if (!m3u8Url || !m3u8Url.includes(".m3u8")) {
    throw new Error("capo7play: m3u8 inválido: " + m3u8Url.substring(0, 80));
  }

  return { m3u8Url, referer: origin + "/" };
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
const CHROMIUM_PATH = "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser";
const PUPPETEER_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
  "--disable-gpu", "--no-first-run", "--disable-infobars", "--window-size=1280,720"
];

async function launchStealthBrowser() {
  const puppeteerExtra = require("puppeteer-extra");
  const StealthPlugin = require("puppeteer-extra-plugin-stealth");
  // Registrar el plugin solo una vez
  if (!launchStealthBrowser._registered) {
    puppeteerExtra.use(StealthPlugin());
    launchStealthBrowser._registered = true;
  }
  return puppeteerExtra.launch({ headless: "new", executablePath: CHROMIUM_PATH, args: PUPPETEER_ARGS });
}

async function extractM3u8FromBolaloca(bola_url) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // ──────────────────────────────────────────────────────────────────
  // PASO 1: Obtener el iframe del player desde bolaloca.my
  // Primero intento estático (rápido), luego Puppeteer si no hay iframe.
  // ──────────────────────────────────────────────────────────────────
  let playerUrl = null;

  try {
    const bola = await axios.get(bola_url, { timeout: 12000, headers: { "User-Agent": UA } });
    // Regex amplio: cualquier iframe que NO sea del propio bolaloca.my ni ads conocidos
    const m = bola.data.match(
      /src=["'](https?:\/\/(?!(?:bolaloca\.my|jnbhi\.com|da\.crimean))[^"']{15,})["']/i
    );
    if (m) playerUrl = m[1];
  } catch(e) { /* silencioso — intentamos con Puppeteer */ }

  // Si el axios no encontró iframe (página con JS), usar Puppeteer sobre bolaloca.my
  if (!playerUrl) {
    console.log(`🔍 bolaloca sin iframe estático, usando Puppeteer para renderizar: ${bola_url}`);
    let browser;
    try {
      browser = await launchStealthBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(UA);
      await page.goto(bola_url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await new Promise(r => setTimeout(r, 3000));
      const iframes = await page.evaluate(() =>
        Array.from(document.querySelectorAll("iframe[src]"))
          .map(f => f.src)
          .filter(s => s && s.startsWith("http") && !s.includes("bolaloca.my"))
      );
      await browser.close(); browser = null;
      if (iframes.length > 0) playerUrl = iframes[0];
    } catch(e) {
      if (browser) await browser.close().catch(() => {});
      throw new Error(`No se pudo obtener iframe de bolaloca.my: ${e.message}`);
    }
  }

  if (!playerUrl) throw new Error("No se encontró iframe de player en bolaloca.my");
  console.log(`🎬 bolaloca iframe → ${playerUrl}`);

  // ──────────────────────────────────────────────────────────────────
  // PASO 2: Detectar tipo de player y extraer m3u8
  // ──────────────────────────────────────────────────────────────────
  let playerHtml = "";
  try {
    const r = await axios.get(playerUrl, {
      timeout: 12000,
      headers: { "User-Agent": UA, "Referer": bola_url }
    });
    playerHtml = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
  } catch(e) { /* puede que no cargue sin JS; seguimos */ }

  // ── Tipo A: bstream.st (proveseat, herdnew, etc.) ──
  // Detectado por la presencia de `stream.js` + `_econfig` en el HTML
  if (playerHtml.includes("stream.js") && playerHtml.includes("_econfig")) {
    console.log(`🎬 bolaloca → bstream.st player (stealth Puppeteer): ${playerUrl}`);
    let browser;
    try {
      browser = await launchStealthBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(UA);
      await page.setExtraHTTPHeaders({ "Accept-Language": "es-MX,es;q=0.9", "Referer": bola_url });

      let m3u8Url = null, streamReferer = playerUrl;
      await page.setRequestInterception(true);
      page.on("request", req => {
        const u = req.url();
        if (u.includes(".m3u8") && !m3u8Url) {
          m3u8Url = u;
          streamReferer = req.headers()["referer"] || playerUrl;
        }
        req.continue();
      });

      await page.goto(playerUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise(resolve => {
        const check = setInterval(() => { if (m3u8Url) { clearInterval(check); resolve(); } }, 300);
        setTimeout(() => { clearInterval(check); resolve(); }, 25000);
      });

      await browser.close(); browser = null;

      if (!m3u8Url) throw new Error("No hay stream en vivo ahora en este canal (bstream.st)");
      console.log(`✅ bolaloca/bstream m3u8: ${m3u8Url}`);
      return { m3u8Url, referer: streamReferer };
    } catch(err) {
      if (browser) await browser.close().catch(() => {});
      throw err;
    }
  }

  // ── Tipo B: m3u8 directo en el HTML (eveningbad y similares) ──
  const directM3u8 = playerHtml.match(/https?:\/\/[^\s"'`<>\\]+\.m3u8[^\s"'`<>\\]*/);
  if (directM3u8) {
    console.log(`✅ bolaloca/directo m3u8: ${directM3u8[0]}`);
    return { m3u8Url: directM3u8[0], referer: playerUrl };
  }

  // ── Tipo C: array ofuscado (hoca6.com / hoca8.com y similares) ──
  const arrMatch = playerHtml.match(/return\s*\(\s*\[([^\]]+)\]\.join\(""\)/);
  if (arrMatch) {
    const chars = arrMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
    const m3u8Base = chars.join("");

    const part2Match = playerHtml.match(/agnlrrtesSaUiuraArbye\s*=\s*\[([^\]]*)\]/);
    const part2 = part2Match ? (part2Match[1].match(/"([^"]*)"/g) || []).map(s => s.slice(1, -1)).join("") : "";

    const part3Match = playerHtml.match(/id=["']ihgSnuiatrekafctBs["'][^>]*>([^<]*)</);
    const part3 = part3Match ? part3Match[1].trim() : "";

    const m3u8Url = (m3u8Base + part2 + part3).replace(/\\/g, "");
    if (m3u8Url.includes(".m3u8")) {
      console.log(`✅ bolaloca/hoca m3u8: ${m3u8Url}`);
      return { m3u8Url, referer: playerUrl };
    }
  }

  const playerHost = new URL(playerUrl).hostname;
  throw new Error(`No se pudo extraer el stream del player (${playerHost}) — tipo de player no reconocido`);
}

app.get("/stream7", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Falta el parámetro ?url=");

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
    new URL(decodedUrl);
  } catch {
    return res.status(400).send("URL inválida");
  }

  const hostname = new URL(decodedUrl).hostname;
  const playerAllowed = ["latamvidz1.com", "esvideofy.com", "bolaloca.my", "streamtpnew.com", "streamvipx.com", "capo7play.com", "streamx550.com", "youtube.com", "youtu.be", "tvtvhd.com", "ftvhd.com", "pltvhd.com", "streams.center"];
  if (!playerAllowed.some(d => hostname === d || hostname.endsWith("." + d))) {
    return res.status(403).send("Dominio no permitido");
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  let m3u8Url, streamReferer;

  try {
    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be") {
      console.log(`🎬 stream7 (youtube) → ${decodedUrl}`);
      // Return player immediately — yt-stream handles extraction+piping asynchronously
      {
        const proxyUrl = `${baseUrl}/yt-stream?url=${encodeURIComponent(decodedUrl)}`;
        const vidTitle = "Video";
        return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${vidTitle} - L3HO</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    :root{--red:#e74c3c;--red2:#c0392b;--bg:#0a0a0a;--ctrl:#111}
    html,body{width:100%;height:100%;background:var(--bg);overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;color:#fff}
    #wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
    video{width:100%;height:100%;object-fit:contain;display:block}
    #loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;z-index:20;gap:16px}
    .spinner{width:52px;height:52px;border:4px solid rgba(255,255,255,.1);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loader p{font-size:13px;color:rgba(255,255,255,.5);letter-spacing:.5px}
    #logo{position:absolute;top:10px;right:12px;z-index:10;pointer-events:none;transition:opacity .4s}
    #logo img{height:32px;width:auto;opacity:.55;filter:drop-shadow(0 1px 4px rgba(0,0,0,.7));transition:opacity .4s}
    #wrap:hover #logo img{opacity:.18}
    #controls{position:absolute;bottom:0;left:0;right:0;padding:0 14px 10px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s;z-index:10}
    #wrap:hover #controls,#wrap.showCtrl #controls{opacity:1}
    #progressWrap{position:relative;height:20px;cursor:pointer;display:flex;align-items:center;margin-bottom:4px}
    #progressBg{position:absolute;left:0;right:0;height:3px;background:rgba(255,255,255,.2);border-radius:2px;transition:height .15s}
    #progressWrap:hover #progressBg{height:5px}
    #progressFill{position:absolute;left:0;height:100%;background:var(--red);border-radius:2px;width:0%;transition:width .2s linear}
    #progressThumb{position:absolute;width:13px;height:13px;background:#fff;border-radius:50%;top:50%;transform:translateY(-50%) scale(0);transition:transform .15s;box-shadow:0 0 4px rgba(0,0,0,.6);left:0}
    #progressWrap:hover #progressThumb{transform:translateY(-50%) scale(1)}
    #btnRow{display:flex;align-items:center;gap:10px}
    .btn{background:none;border:none;color:#fff;cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .btn:hover{background:rgba(255,255,255,.12)}
    .btn svg{width:20px;height:20px;fill:currentColor}
    #volSlider{-webkit-appearance:none;appearance:none;width:72px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;outline:none;cursor:pointer}
    #volSlider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#fff;border-radius:50%;cursor:pointer}
    #timeLabel{font-size:11px;color:rgba(255,255,255,.7);white-space:nowrap;margin-left:2px}
    #spacer{flex:1}
    #qualityLabel{font-size:11px;background:rgba(255,255,255,.15);padding:3px 8px;border-radius:4px;color:rgba(255,255,255,.8)}
    #errOverlay{position:absolute;inset:0;background:rgba(0,0,0,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:30;gap:14px;padding:24px;text-align:center}
    #errOverlay svg{width:52px;height:52px;fill:var(--red);opacity:.8}
    #errOverlay h2{font-size:18px;color:#fff}
    #errOverlay p{font-size:13px;color:rgba(255,255,255,.5);max-width:280px}
    #retryBtn{background:var(--red);color:#fff;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.3px;transition:background .2s}
    #retryBtn:hover{background:var(--red2)}
    #tapFx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
    .tapCircle{width:70px;height:70px;background:rgba(255,255,255,.18);border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.5);transition:opacity .25s,transform .25s;backdrop-filter:blur(4px)}
    .tapCircle.show{opacity:1;transform:scale(1)}
    .tapCircle svg{width:30px;height:30px;fill:#fff}
  </style>
</head>
<body>
<div id="wrap">
  <video id="video" playsinline preload="auto"></video>
  <div id="loader"><div class="spinner"></div><p>Cargando video...</p></div>
  <div id="logo"><img src="${baseUrl}/public/ultragol-logo.png" alt="L3HO"></div>
  <div id="tapFx"><div class="tapCircle" id="tapCircle"><svg viewBox="0 0 24 24" id="tapIcon"><path d="M8 5v14l11-7z"/></svg></div></div>
  <div id="controls">
    <div id="progressWrap">
      <div id="progressBg"><div id="progressFill"></div></div>
      <div id="progressThumb"></div>
    </div>
    <div id="btnRow">
      <button class="btn" id="btnPlay"><svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg></button>
      <button class="btn" id="btnMute"><svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg></button>
      <input type="range" id="volSlider" min="0" max="1" step="0.05" value="1">
      <span id="timeLabel">0:00 / 0:00</span>
      <div id="spacer"></div>
      <span id="qualityLabel">MP4</span>
      <button class="btn" id="btnPip" title="Ventana flotante" style="display:none"><svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg></button>
      <button class="btn" id="btnFs"><svg viewBox="0 0 24 24" id="fsIcon"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
    </div>
  </div>
  <div id="errOverlay">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    <h2>Video no disponible</h2>
    <p>El video puede haber expirado. Vuelve a cargar la página original.</p>
    <button id="retryBtn">&#8635; Reintentar</button>
  </div>
</div>
<script>
(function(){
  var SRC = ${JSON.stringify(proxyUrl)};
  var video      = document.getElementById("video");
  var loader     = document.getElementById("loader");
  var errOverlay = document.getElementById("errOverlay");
  var btnPlay    = document.getElementById("btnPlay");
  var playIcon   = document.getElementById("playIcon");
  var btnMute    = document.getElementById("btnMute");
  var volIcon    = document.getElementById("volIcon");
  var volSlider  = document.getElementById("volSlider");
  var timeLabel  = document.getElementById("timeLabel");
  var progressFill  = document.getElementById("progressFill");
  var progressThumb = document.getElementById("progressThumb");
  var progressWrap  = document.getElementById("progressWrap");
  var qualityLabel  = document.getElementById("qualityLabel");
  var btnFs      = document.getElementById("btnFs");
  var btnPip     = document.getElementById("btnPip");
  var wrap       = document.getElementById("wrap");
  var tapCircle  = document.getElementById("tapCircle");
  var tapIcon    = document.getElementById("tapIcon");
  var ctrlTimer;

  var ICONS = {
    play:  '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    volOn: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',
    volOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    fsOn:  '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    fsOff: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
  };
  function setIcon(el, key){ el.innerHTML = ICONS[key]; }

  function showCtrl(){ wrap.classList.add("showCtrl"); clearTimeout(ctrlTimer); ctrlTimer=setTimeout(()=>wrap.classList.remove("showCtrl"),3000); }
  wrap.addEventListener("mousemove", showCtrl);
  wrap.addEventListener("touchstart", showCtrl, {passive:true});

  function togglePlay(){
    if(video.paused){ video.play(); } else { video.pause(); }
    var tapTimer;
    tapCircle.classList.add("show");
    clearTimeout(tapTimer);
    tapTimer = setTimeout(()=>tapCircle.classList.remove("show"), 600);
  }
  btnPlay.addEventListener("click", function(e){ e.stopPropagation(); togglePlay(); });
  video.addEventListener("click", togglePlay);
  video.addEventListener("play",  function(){ setIcon(playIcon,"pause"); setIcon(tapIcon,"pause"); });
  video.addEventListener("pause", function(){ setIcon(playIcon,"play");  setIcon(tapIcon,"play"); });

  volSlider.addEventListener("input", function(){
    video.volume = this.value; video.muted = this.value == 0;
    setIcon(volIcon, video.muted ? "volOff" : "volOn");
  });
  btnMute.addEventListener("click", function(){
    video.muted = !video.muted;
    volSlider.value = video.muted ? 0 : video.volume;
    setIcon(volIcon, video.muted ? "volOff" : "volOn");
  });

  function fmtTime(s){ var m=Math.floor(s/60); s=Math.floor(s%60); return m+":"+(s<10?"0":"")+s; }
  video.addEventListener("timeupdate", function(){
    if(!video.duration) return;
    var pct = (video.currentTime/video.duration)*100;
    progressFill.style.width = pct+"%";
    progressThumb.style.left = pct+"%";
    timeLabel.textContent = fmtTime(video.currentTime)+" / "+fmtTime(video.duration);
  });
  progressWrap.addEventListener("click", function(e){
    if(!video.duration) return;
    var r=this.getBoundingClientRect();
    video.currentTime = ((e.clientX-r.left)/r.width)*video.duration;
  });

  video.addEventListener("loadedmetadata", function(){
    if(video.videoWidth && video.videoHeight){ qualityLabel.textContent = video.videoHeight+"p"; }
  });

  btnFs.addEventListener("click", function(){
    var el = document.documentElement;
    if(!document.fullscreenElement && !document.webkitFullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen).call(el);
      setIcon(document.getElementById("fsIcon"),"fsOff");
    } else {
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      setIcon(document.getElementById("fsIcon"),"fsOn");
    }
  });
  if(document.pictureInPictureEnabled){
    btnPip.style.display="flex";
    btnPip.addEventListener("click", function(){
      if(document.pictureInPictureElement){ document.exitPictureInPicture().catch(function(){}); }
      else { video.requestPictureInPicture().catch(function(){}); }
    });
  }

  var loaderP = loader.querySelector('p');
  var dotTimer = setInterval(function(){
    var t = loaderP.textContent.replace(/\.+$/,'');
    loaderP.textContent = t + (t.length < loaderP.getAttribute('data-base')||false ? '' : '') + '.';
    if(loaderP.textContent.length > (loaderP.getAttribute('data-base')||'Cargando video').length + 3)
      loaderP.textContent = loaderP.getAttribute('data-base') || 'Cargando video';
  }, 600);
  loaderP.setAttribute('data-base', loaderP.textContent);

  function hideLoaderAndPlay(){
    clearInterval(dotTimer);
    loader.style.display = "none";
    video.play().catch(function(){});
  }
  video.addEventListener("canplay",    hideLoaderAndPlay);
  video.addEventListener("loadeddata", hideLoaderAndPlay);
  video.addEventListener("playing",    function(){ loader.style.display="none"; clearInterval(dotTimer); });

  video.addEventListener("error", function(){
    clearInterval(dotTimer);
    var code = video.error ? video.error.code : '?';
    var msg  = video.error ? (video.error.message||'') : '';
    var codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'FORMAT'};
    errOverlay.querySelector('p').textContent = 'Error ' + code + ' (' + (codes[code]||'?') + ') ' + msg;
    errOverlay.style.display="flex"; loader.style.display="none";
  });
  document.getElementById("retryBtn").addEventListener("click", function(){
    errOverlay.style.display="none"; loader.style.display="flex";
    video.load(); video.play().catch(function(){});
  });

  video.src = SRC;
})();
</script>
</body>
</html>`);
      }
    } else if (hostname === "capo7play.com" || hostname.endsWith(".capo7play.com")) {
      console.log(`🎬 stream7 (capo7play) → ${decodedUrl}`);
      const extracted = await extractM3u8FromCapo7play(decodedUrl);
      m3u8Url = extracted.m3u8Url;
      streamReferer = extracted.referer;
    } else if (hostname === "bolaloca.my" || hostname.endsWith(".bolaloca.my")) {
      console.log(`🎬 stream7 (bolaloca) → ${decodedUrl}`);
      const extracted = await extractM3u8FromBolaloca(decodedUrl);
      m3u8Url = extracted.m3u8Url;
      streamReferer = extracted.referer;
    } else if (hostname === "streamtpnew.com" || hostname.endsWith(".streamtpnew.com") || hostname === "streamx550.com" || hostname.endsWith(".streamx550.com")) {
      console.log(`🎬 stream7 (streamtpnew/streamx550) → ${decodedUrl}`);
      const extracted = await extractM3u8FromStreamtpnew(decodedUrl);
      m3u8Url = extracted.m3u8Url;
      streamReferer = extracted.referer;
    } else if (hostname === "streamvipx.com" || hostname.endsWith(".streamvipx.com")) {
      console.log(`🎬 stream7 (streamvipx) → ${decodedUrl}`);
      const extracted = await extractM3u8FromStreamvipx(decodedUrl);
      m3u8Url = extracted.m3u8Url;
      streamReferer = extracted.referer;
    } else if (hostname === "streams.center" || hostname.endsWith(".streams.center")) {
      console.log(`🎬 stream7 (streams.center) → ${decodedUrl}`);
      const extracted = await extractM3u8FromStreamsCenter(decodedUrl);
      m3u8Url = extracted.m3u8Url;
      streamReferer = extracted.referer;
    } else if (hostname === "tvtvhd.com" || hostname.endsWith(".tvtvhd.com") || hostname === "ftvhd.com" || hostname.endsWith(".ftvhd.com")) {
      console.log(`🎬 stream7 (tvtvhd) → ${decodedUrl}`);
      // Use a live relay that re-fetches a fresh token on every m3u8 refresh
      const relayUrl = `${baseUrl}/tvtvhd-relay?page=${encodeURIComponent(decodedUrl)}`;
      return res.send(buildLivePlayer(relayUrl, baseUrl));
    } else {
      console.log(`🎬 stream7 → obteniendo player: ${decodedUrl}`);
      const upstream = await axios.get(decodedUrl, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": STREAM7_REFERER,
          "Origin": "https://futbollibretv.su",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const html = upstream.data;
      const m3u8Match = html.match(/var\s+playbackURL\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
      if (!m3u8Match) return res.status(502).send("No se encontró el stream en la respuesta del servidor.");
      m3u8Url = m3u8Match[1];
      streamReferer = STREAM7_REFERER;
    }

    const proxiedM3u8 = `${baseUrl}/hls7?url=${encodeURIComponent(m3u8Url)}&ref=${encodeURIComponent(streamReferer || "")}`;

    const playerPageUrl = `${baseUrl}/stream7?url=${encodeURIComponent(decodedUrl)}`;
    const playerHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>En Vivo - L3HO</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    :root{--red:#e74c3c;--red2:#c0392b;--bg:#0a0a0a;--ctrl:#111}
    html,body{width:100%;height:100%;background:var(--bg);overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;color:#fff}

    /* ── Wrapper ── */
    #wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
    video{width:100%;height:100%;object-fit:contain;display:block}

    /* ── Spinner de carga ── */
    #loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;z-index:20;gap:16px}
    .spinner{width:52px;height:52px;border:4px solid rgba(255,255,255,.1);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loader p{font-size:13px;color:rgba(255,255,255,.5);letter-spacing:.5px}

    /* ── Logo Ultragol ── */
    #logo{position:absolute;top:10px;right:12px;z-index:10;pointer-events:none;transition:opacity .4s}
    #logo img{height:32px;width:auto;opacity:.55;filter:drop-shadow(0 1px 4px rgba(0,0,0,.7));transition:opacity .4s}
    #wrap:hover #logo img{opacity:.18}

    /* ── Controles custom ── */
    #controls{position:absolute;bottom:0;left:0;right:0;padding:0 14px 10px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s;z-index:10}
    #wrap:hover #controls,#wrap.showCtrl #controls{opacity:1}

    /* Progress bar */
    #progressWrap{position:relative;height:20px;cursor:pointer;display:flex;align-items:center;margin-bottom:4px}
    #progressBg{position:absolute;left:0;right:0;height:3px;background:rgba(255,255,255,.2);border-radius:2px;transition:height .15s}
    #progressWrap:hover #progressBg{height:5px}
    #progressFill{position:absolute;left:0;height:100%;background:var(--red);border-radius:2px;width:0%;transition:width .2s linear}
    #progressThumb{position:absolute;width:13px;height:13px;background:#fff;border-radius:50%;top:50%;transform:translateY(-50%) scale(0);transition:transform .15s;box-shadow:0 0 4px rgba(0,0,0,.6);left:0}
    #progressWrap:hover #progressThumb{transform:translateY(-50%) scale(1)}
    #liveBar{position:absolute;left:0;right:0;height:100%;background:linear-gradient(90deg,rgba(231,76,60,.6),rgba(231,76,60,.2));border-radius:2px}

    /* Botones */
    #btnRow{display:flex;align-items:center;gap:10px}
    .btn{background:none;border:none;color:#fff;cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .btn:hover{background:rgba(255,255,255,.12)}
    .btn svg{width:20px;height:20px;fill:currentColor}
    #volSlider{-webkit-appearance:none;appearance:none;width:72px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;outline:none;cursor:pointer}
    #volSlider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#fff;border-radius:50%;cursor:pointer}
    #timeLabel{font-size:11px;color:rgba(255,255,255,.7);white-space:nowrap;margin-left:2px}
    #spacer{flex:1}
    #qualityLabel{font-size:11px;background:rgba(255,255,255,.15);padding:3px 8px;border-radius:4px;color:rgba(255,255,255,.8)}

    /* ── Overlay error ── */
    #errOverlay{position:absolute;inset:0;background:rgba(0,0,0,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:30;gap:14px;padding:24px;text-align:center}
    #errOverlay svg{width:52px;height:52px;fill:var(--red);opacity:.8}
    #errOverlay h2{font-size:18px;color:#fff}
    #errOverlay p{font-size:13px;color:rgba(255,255,255,.5);max-width:280px}
    #retryBtn{background:var(--red);color:#fff;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.3px;transition:background .2s}
    #retryBtn:hover{background:var(--red2)}

    /* ── Centro play/pause tap ── */
    #tapFx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
    .tapCircle{width:70px;height:70px;background:rgba(255,255,255,.18);border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.5);transition:opacity .25s,transform .25s;backdrop-filter:blur(4px)}
    .tapCircle.show{opacity:1;transform:scale(1)}
    .tapCircle svg{width:30px;height:30px;fill:#fff}
  </style>
</head>
<body>
<div id="wrap">
  <video id="video" playsinline></video>

  <!-- Loader -->
  <div id="loader">
    <div class="spinner"></div>
    <p>Conectando al stream...</p>
  </div>

  <!-- Logo Ultragol -->
  <div id="logo">
    <img src="/public/ultragol-logo.png" alt="Ultragol">
  </div>

  <!-- Tap feedback (centro) -->
  <div id="tapFx"><div class="tapCircle" id="tapCircle">
    <svg viewBox="0 0 24 24" id="tapIcon"><path d="M8 5v14l11-7z"/></svg>
  </div></div>

  <!-- Controles -->
  <div id="controls">
    <div id="progressWrap" id="progressBar">
      <div id="progressBg">
        <div id="liveBar" style="display:none"></div>
        <div id="progressFill"></div>
      </div>
      <div id="progressThumb"></div>
    </div>
    <div id="btnRow">
      <button class="btn" id="btnPlay" title="Play/Pause">
        <svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="btn" id="btnMute" title="Silenciar">
        <svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg>
      </button>
      <input type="range" id="volSlider" min="0" max="1" step="0.05" value="1">
      <span id="timeLabel">EN VIVO</span>
      <div id="spacer"></div>
      <span id="qualityLabel">HD</span>
      <button class="btn" id="btnPip" title="Ventana flotante (PiP)" style="display:none">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>
      </button>
      <button class="btn" id="btnFs" title="Pantalla completa">
        <svg viewBox="0 0 24 24" id="fsIcon"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
      </button>
    </div>
  </div>

  <!-- Error overlay -->
  <div id="errOverlay">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    <h2>Stream no disponible</h2>
    <p>El canal puede no estar transmitiendo en este momento.</p>
    <button id="retryBtn">&#8635; Reintentar</button>
  </div>
</div>

<script>
(function(){
  var SRC = "${proxiedM3u8}";
  var video    = document.getElementById("video");
  var loader   = document.getElementById("loader");
  var errOverlay = document.getElementById("errOverlay");
  var btnPlay  = document.getElementById("btnPlay");
  var playIcon = document.getElementById("playIcon");
  var btnMute  = document.getElementById("btnMute");
  var volIcon  = document.getElementById("volIcon");
  var volSlider= document.getElementById("volSlider");
  var timeLabel= document.getElementById("timeLabel");
  var progressFill = document.getElementById("progressFill");
  var progressThumb= document.getElementById("progressThumb");
  var progressWrap = document.getElementById("progressWrap");
  var liveBar  = document.getElementById("liveBar");
  var qualityLabel = document.getElementById("qualityLabel");
  var btnFs    = document.getElementById("btnFs");
  var btnPip   = document.getElementById("btnPip");
  var wrap     = document.getElementById("wrap");
  var tapCircle= document.getElementById("tapCircle");
  var tapIcon  = document.getElementById("tapIcon");
  var retries  = 0;
  var maxRetries = 3;
  var hlsInstance = null;
  var isLive = true;
  var ctrlTimer;

  /* ── Icons ── */
  var ICONS = {
    play:  '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    volOn: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',
    volOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    fsOn:  '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    fsOff: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
  };

  function setIcon(el, key){ el.innerHTML = ICONS[key]; }

  /* ── Show/hide loader ── */
  function showLoader(msg){ loader.querySelector("p").textContent = msg||"Conectando al stream..."; loader.style.display="flex"; }
  function hideLoader(){ loader.style.display="none"; }
  function showError(){ errOverlay.style.display="flex"; loader.style.display="none"; }

  /* ── Controls auto-hide ── */
  function showCtrl(){ wrap.classList.add("showCtrl"); clearTimeout(ctrlTimer); ctrlTimer=setTimeout(()=>wrap.classList.remove("showCtrl"),3000); }
  wrap.addEventListener("mousemove", showCtrl);
  wrap.addEventListener("touchstart", showCtrl, {passive:true});

  /* ── Play/Pause ── */
  function togglePlay(){
    if(video.paused){ video.play(); setIcon(playIcon,"pause"); setIcon(tapIcon,"pause"); }
    else { video.pause(); setIcon(playIcon,"play"); setIcon(tapIcon,"play"); }
    flashTap();
  }
  btnPlay.addEventListener("click", function(e){ e.stopPropagation(); togglePlay(); });
  video.addEventListener("click", togglePlay);
  video.addEventListener("play",  function(){ setIcon(playIcon,"pause"); });
  video.addEventListener("pause", function(){ setIcon(playIcon,"play"); });

  /* ── Tap circle feedback ── */
  var tapTimer;
  function flashTap(){
    tapCircle.classList.add("show");
    clearTimeout(tapTimer);
    tapTimer = setTimeout(()=>tapCircle.classList.remove("show"), 600);
  }

  /* ── Volume ── */
  volSlider.addEventListener("input", function(){
    video.volume = this.value;
    video.muted = this.value == 0;
    setIcon(volIcon, video.muted ? "volOff" : "volOn");
  });
  btnMute.addEventListener("click", function(){
    video.muted = !video.muted;
    volSlider.value = video.muted ? 0 : video.volume;
    setIcon(volIcon, video.muted ? "volOff" : "volOn");
  });

  /* ── Progress ── */
  function updateProgress(){
    if(isLive || !video.duration){ return; }
    var pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = pct + "%";
    progressThumb.style.left = pct + "%";
    var cur = fmtTime(video.currentTime), dur = fmtTime(video.duration);
    timeLabel.textContent = cur + " / " + dur;
  }
  video.addEventListener("timeupdate", updateProgress);

  function fmtTime(s){ var m=Math.floor(s/60); s=Math.floor(s%60); return m+":"+(s<10?"0":"")+s; }

  progressWrap.addEventListener("click", function(e){
    if(isLive||!video.duration) return;
    var r=this.getBoundingClientRect();
    video.currentTime = ((e.clientX-r.left)/r.width)*video.duration;
  });

  /* ── Fullscreen ── */
  btnFs.addEventListener("click", function(){
    var el = document.documentElement;
    if(!document.fullscreenElement && !document.webkitFullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen).call(el);
      setIcon(document.getElementById("fsIcon"),"fsOff");
    } else {
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      setIcon(document.getElementById("fsIcon"),"fsOn");
    }
  });

  /* ── Picture-in-Picture ── */
  if(document.pictureInPictureEnabled){
    btnPip.style.display = "flex";
    btnPip.addEventListener("click", function(){
      if(document.pictureInPictureElement){
        document.exitPictureInPicture().catch(function(){});
      } else {
        video.requestPictureInPicture().catch(function(){});
      }
    });
    video.addEventListener("enterpictureinpicture", function(){
      btnPip.title = "Salir de ventana flotante";
      btnPip.style.opacity = "1";
      btnPip.querySelector("svg").style.fill = "var(--red)";
    });
    video.addEventListener("leavepictureinpicture", function(){
      btnPip.title = "Ventana flotante (PiP)";
      btnPip.querySelector("svg").style.fill = "currentColor";
    });
  }

  /* ── HLS Player ── */
  function initPlayer(){
    showLoader(retries>0 ? "Reintentando... ("+retries+"/"+maxRetries+")" : "Conectando al stream...");
    errOverlay.style.display = "none";

    if(hlsInstance){ hlsInstance.destroy(); hlsInstance=null; }

    if(Hls.isSupported()){
      var hls = new Hls({
        maxBufferLength: 20,
        liveSyncDurationCount: 3,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        enableWorker: true
      });
      hlsInstance = hls;
      hls.loadSource(SRC);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function(e, data){
        hideLoader();
        isLive = video.duration === Infinity || isNaN(video.duration);
        if(isLive){
          liveBar.style.display="block";
          progressFill.style.width="100%";
          timeLabel.textContent="EN VIVO";
        }
        // Quality label
        var lvl = hls.levels[hls.currentLevel];
        if(lvl && lvl.height){ qualityLabel.textContent = lvl.height+"p"; }
        video.play().catch(function(){});
        retries = 0;
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, function(e, data){
        var lvl = hls.levels[data.level];
        if(lvl && lvl.height){ qualityLabel.textContent = lvl.height+"p"; }
      });

      hls.on(Hls.Events.ERROR, function(e, data){
        if(data.fatal){
          hls.destroy(); hlsInstance=null;
          if(retries < maxRetries){
            retries++;
            showLoader("Error, reintentando... ("+retries+"/"+maxRetries+")");
            setTimeout(initPlayer, 3000);
          } else { showError(); }
        }
      });
    } else if(video.canPlayType("application/vnd.apple.mpegurl")){
      video.src = SRC;
      video.addEventListener("loadedmetadata", function(){ hideLoader(); video.play().catch(function(){}); });
      video.addEventListener("error", function(){
        if(retries<maxRetries){ retries++; setTimeout(initPlayer,3000); }
        else showError();
      });
    } else { showError(); }
  }

  document.getElementById("retryBtn").addEventListener("click", function(){ retries=0; initPlayer(); });
  initPlayer();
})();
</script>
</body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("X-Frame-Options", "ALLOWALL");
    res.set("Cache-Control", "no-cache");
    res.send(playerHtml);
  } catch (error) {
    console.error("❌ stream7 error:", error.message);
    res.status(502).send(`No se pudo obtener el stream: ${error.message}`);
  }
});

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

function buildLivePlayer(m3u8Src, baseUrl) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>En Vivo - L3HO</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    :root{--red:#e74c3c;--red2:#c0392b;--bg:#0a0a0a;--ctrl:#111}
    html,body{width:100%;height:100%;background:var(--bg);overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;color:#fff}
    #wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
    video{width:100%;height:100%;object-fit:contain;display:block}
    #loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;z-index:20;gap:16px}
    .spinner{width:52px;height:52px;border:4px solid rgba(255,255,255,.1);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loader p{font-size:13px;color:rgba(255,255,255,.5);letter-spacing:.5px}
    #logo{position:absolute;top:10px;right:12px;z-index:10;pointer-events:none;transition:opacity .4s}
    #logo img{height:32px;width:auto;opacity:.55;filter:drop-shadow(0 1px 4px rgba(0,0,0,.7));transition:opacity .4s}
    #wrap:hover #logo img{opacity:.18}
    #controls{position:absolute;bottom:0;left:0;right:0;padding:0 14px 10px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s;z-index:10}
    #wrap:hover #controls,#wrap.showCtrl #controls{opacity:1}
    #progressWrap{position:relative;height:20px;cursor:pointer;display:flex;align-items:center;margin-bottom:4px}
    #progressBg{position:absolute;left:0;right:0;height:3px;background:rgba(255,255,255,.2);border-radius:2px;transition:height .15s}
    #progressWrap:hover #progressBg{height:5px}
    #liveBar{position:absolute;left:0;right:0;height:100%;background:linear-gradient(90deg,rgba(231,76,60,.6),rgba(231,76,60,.2));border-radius:2px}
    #progressFill{position:absolute;left:0;height:100%;background:var(--red);border-radius:2px;width:0%;transition:width .2s linear}
    #progressThumb{position:absolute;width:13px;height:13px;background:#fff;border-radius:50%;top:50%;transform:translateY(-50%) scale(0);transition:transform .15s;box-shadow:0 0 4px rgba(0,0,0,.6);left:0}
    #progressWrap:hover #progressThumb{transform:translateY(-50%) scale(1)}
    #btnRow{display:flex;align-items:center;gap:10px}
    .btn{background:none;border:none;color:#fff;cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .btn:hover{background:rgba(255,255,255,.12)}
    .btn svg{width:20px;height:20px;fill:currentColor}
    #volSlider{-webkit-appearance:none;appearance:none;width:72px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;outline:none;cursor:pointer}
    #volSlider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#fff;border-radius:50%;cursor:pointer}
    #spacer{flex:1}
    #qualityLabel{font-size:11px;background:rgba(255,255,255,.15);padding:3px 8px;border-radius:4px;color:rgba(255,255,255,.8)}
    #errOverlay{position:absolute;inset:0;background:rgba(0,0,0,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:30;gap:14px;padding:24px;text-align:center}
    #errOverlay svg{width:52px;height:52px;fill:var(--red);opacity:.8}
    #errOverlay h2{font-size:18px;color:#fff}
    #errOverlay p{font-size:13px;color:rgba(255,255,255,.5);max-width:280px}
    #retryBtn{background:var(--red);color:#fff;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.3px;transition:background .2s}
    #retryBtn:hover{background:var(--red2)}
    #tapFx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
    .tapCircle{width:70px;height:70px;background:rgba(255,255,255,.18);border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.5);transition:opacity .25s,transform .25s;backdrop-filter:blur(4px)}
    .tapCircle.show{opacity:1;transform:scale(1)}
    .tapCircle svg{width:30px;height:30px;fill:#fff}
  </style>
</head>
<body>
<div id="wrap">
  <video id="video" playsinline></video>
  <div id="loader"><div class="spinner"></div><p>Conectando al stream...</p></div>
  <div id="logo"><img src="${baseUrl}/public/ultragol-logo.png" alt="L3HO"></div>
  <div id="tapFx"><div class="tapCircle" id="tapCircle">
    <svg viewBox="0 0 24 24" id="tapIcon"><path d="M8 5v14l11-7z"/></svg>
  </div></div>
  <div id="controls">
    <div id="progressWrap">
      <div id="progressBg">
        <div id="liveBar"></div>
        <div id="progressFill"></div>
      </div>
      <div id="progressThumb"></div>
    </div>
    <div id="btnRow">
      <button class="btn" id="btnPlay"><svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg></button>
      <button class="btn" id="btnMute"><svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg></button>
      <input type="range" id="volSlider" min="0" max="1" step="0.05" value="1">
      <div id="spacer"></div>
      <span id="qualityLabel">LIVE</span>
      <button class="btn" id="btnPip" title="Ventana flotante" style="display:none"><svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg></button>
      <button class="btn" id="btnFs"><svg viewBox="0 0 24 24" id="fsIcon"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
    </div>
  </div>
  <div id="errOverlay">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    <h2>Stream no disponible</h2>
    <p>El canal puede estar fuera de línea o la señal expiró.</p>
    <button id="retryBtn">&#8635; Reintentar</button>
  </div>
</div>
<script>
(function(){
  var M3U8 = ${JSON.stringify(m3u8Src)};
  var video      = document.getElementById('video');
  var loader     = document.getElementById('loader');
  var errOverlay = document.getElementById('errOverlay');
  var playIcon   = document.getElementById('playIcon');
  var volIcon    = document.getElementById('volIcon');
  var volSlider  = document.getElementById('volSlider');
  var progressFill  = document.getElementById('progressFill');
  var progressThumb = document.getElementById('progressThumb');
  var progressWrap  = document.getElementById('progressWrap');
  var liveBar    = document.getElementById('liveBar');
  var qualityLabel = document.getElementById('qualityLabel');
  var btnFs      = document.getElementById('btnFs');
  var btnPip     = document.getElementById('btnPip');
  var wrap       = document.getElementById('wrap');
  var tapCircle  = document.getElementById('tapCircle');
  var tapIcon    = document.getElementById('tapIcon');
  var ctrlTimer;
  var hls;

  var ICONS = {
    play:  '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    volOn: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',
    volOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    fsOn:  '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    fsOff: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
  };
  function setIcon(el, key){ el.innerHTML = ICONS[key]; }

  function showCtrl(){
    wrap.classList.add('showCtrl');
    clearTimeout(ctrlTimer);
    ctrlTimer = setTimeout(function(){ wrap.classList.remove('showCtrl'); }, 3000);
  }
  wrap.addEventListener('mousemove', showCtrl);
  wrap.addEventListener('touchstart', showCtrl, {passive:true});

  function togglePlay(){
    if(video.paused){ video.play(); } else { video.pause(); }
    tapCircle.classList.add('show');
    clearTimeout(togglePlay._t);
    togglePlay._t = setTimeout(function(){ tapCircle.classList.remove('show'); }, 600);
  }
  document.getElementById('btnPlay').addEventListener('click', function(e){ e.stopPropagation(); togglePlay(); });
  video.addEventListener('click', togglePlay);
  video.addEventListener('play',  function(){ setIcon(playIcon,'pause'); setIcon(tapIcon,'pause'); });
  video.addEventListener('pause', function(){ setIcon(playIcon,'play');  setIcon(tapIcon,'play'); });

  volSlider.addEventListener('input', function(){
    video.volume = this.value; video.muted = this.value == 0;
    setIcon(volIcon, video.muted ? 'volOff' : 'volOn');
  });
  document.getElementById('btnMute').addEventListener('click', function(){
    video.muted = !video.muted;
    volSlider.value = video.muted ? 0 : video.volume;
    setIcon(volIcon, video.muted ? 'volOff' : 'volOn');
  });

  btnFs.addEventListener('click', function(){
    var el = document.documentElement;
    if(!document.fullscreenElement && !document.webkitFullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen).call(el);
      setIcon(document.getElementById('fsIcon'),'fsOff');
    } else {
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      setIcon(document.getElementById('fsIcon'),'fsOn');
    }
  });

  if(document.pictureInPictureEnabled){
    btnPip.style.display='flex';
    btnPip.addEventListener('click', function(){
      if(document.pictureInPictureElement){ document.exitPictureInPicture().catch(function(){}); }
      else { video.requestPictureInPicture().catch(function(){}); }
    });
  }

  function initPlayer() {
    errOverlay.style.display = 'none';
    loader.style.display = 'flex';
    liveBar.style.display = 'block';
    progressFill.style.width = '0%';
    if (hls) { hls.destroy(); hls = null; }
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, xhrSetup: function(xhr){ xhr.withCredentials = false; } });
      hls.loadSource(M3U8);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function(e, data) {
        loader.style.display = 'none';
        if (data.levels && data.levels.length && data.levels[0].height) {
          qualityLabel.textContent = data.levels[0].height + 'p';
        }
        video.play().catch(function(){});
      });
      hls.on(Hls.Events.ERROR, function(e, data) {
        if (data.fatal) { loader.style.display = 'none'; errOverlay.style.display = 'flex'; }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = M3U8;
      video.addEventListener('loadedmetadata', function() { loader.style.display = 'none'; video.play().catch(function(){}); });
      video.addEventListener('error', function() { loader.style.display = 'none'; errOverlay.style.display = 'flex'; });
    } else {
      loader.style.display = 'none'; errOverlay.style.display = 'flex';
    }
  }

  video.addEventListener('playing', function(){ loader.style.display = 'none'; });
  document.getElementById('retryBtn').addEventListener('click', initPlayer);
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
    // Step 1: fetch tvtvhd page to get fresh token
    const pageResp = await axios.get(decodedPage, {
      timeout: 12000,
      headers: { "User-Agent": UA, "Referer": "https://tvtvhd.com/", "Accept": "text/html,application/xhtml+xml" }
    });
    const match = pageResp.data.match(/var\s+playbackURL\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
    if (!match) return res.status(502).send("No se encontró playbackURL");
    const m3u8Url = match[1];

    // Step 2: fetch the m3u8 content immediately (same server IP = valid token)
    const m3u8Resp = await axios.get(m3u8Url, {
      timeout: 10000,
      headers: { "User-Agent": UA, "Referer": "https://tvtvhd.com/", "Origin": "https://tvtvhd.com" }
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const m3u8Base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
    const refParam = `&ref=${encodeURIComponent("https://tvtvhd.com/")}`;

    // Step 3: rewrite segments to go through hls7-seg proxy
    let content = String(m3u8Resp.data);
    content = content.replace(/^((?!#).+\.ts(?:[?&][^\s]*)?)$/gm, (line) => {
      const abs = line.startsWith("http") ? line : m3u8Base + line;
      return `${baseUrl}/hls7-seg?url=${encodeURIComponent(abs)}${refParam}`;
    });
    content = content.replace(/^((?!#)(?!.+\/hls7).+\.m3u8[^\s]*)$/gm, (line) => {
      const abs = line.startsWith("http") ? line : m3u8Base + line;
      return `${baseUrl}/hls7?url=${encodeURIComponent(abs)}${refParam}`;
    });
    content = content.replace(/URI="([^"]+)"/g, (m, uri) => {
      const abs = uri.startsWith("http") ? uri : m3u8Base + uri;
      return `URI="${baseUrl}/hls7-seg?url=${encodeURIComponent(abs)}${refParam}"`;
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

app.get("/hls7", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Falta ?url=");

  let decodedUrl;
  try { decodedUrl = decodeURIComponent(targetUrl); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  if (!stream7IsAllowed(decodedUrl)) return res.status(403).send("Dominio no permitido");

  const referer = req.query.ref ? req.query.ref : STREAM7_REFERER;
  const refParam = req.query.ref ? `&ref=${encodeURIComponent(req.query.ref)}` : "";

  try {
    const upstream = await axios.get(decodedUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": referer
      }
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const m3u8Base = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);

    let content = upstream.data;

    // Reescribir segmentos .ts primero (evitar que capturemos .ts.m3u8)
    content = content.replace(/^((?!#).+\.ts(?:[?&][^\s]*)?)$/gm, (line) => {
      const abs = line.startsWith("http") ? line : m3u8Base + line;
      return `${baseUrl}/hls7-seg?url=${encodeURIComponent(abs)}${refParam}`;
    });

    // Reescribir variantes .m3u8 (incluyendo mono.ts.m3u8, etc.)
    content = content.replace(/^((?!#)(?!.+\/hls7).+\.m3u8[^\s]*)$/gm, (line) => {
      const abs = line.startsWith("http") ? line : m3u8Base + line;
      return `${baseUrl}/hls7?url=${encodeURIComponent(abs)}${refParam}`;
    });

    content = content.replace(/URI="([^"]+)"/g, (match, uri) => {
      const abs = uri.startsWith("http") ? uri : m3u8Base + uri;
      return `URI="${baseUrl}/hls7-seg?url=${encodeURIComponent(abs)}${refParam}"`;
    });

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-cache");
    res.send(content);
  } catch (error) {
    console.error("❌ hls7 error:", error.message);
    res.status(502).send(`Error en proxy m3u8: ${error.message}`);
  }
});

app.get("/hls7-seg", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Falta ?url=");

  let decodedUrl;
  try { decodedUrl = decodeURIComponent(targetUrl); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  if (!stream7IsAllowed(decodedUrl)) return res.status(403).send("Dominio no permitido");

  const referer = req.query.ref ? req.query.ref : STREAM7_REFERER;

  try {
    const upstream = await axios.get(decodedUrl, {
      timeout: 20000,
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": referer
      }
    });

    const contentType = upstream.headers["content-type"] || "video/MP2T";
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-cache");
    res.send(upstream.data);
  } catch (error) {
    console.error("❌ hls7-seg error:", error.message);
    res.status(502).send(`Error en proxy segmento: ${error.message}`);
  }
});

// === PROXY HLS PARA CANALES ===
app.get("/hls-canal", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Falta ?url=");
  let decodedUrl;
  try { decodedUrl = decodeURIComponent(targetUrl); new URL(decodedUrl); }
  catch { return res.status(400).send("URL inválida"); }

  try {
    const upstream = await axios.get(decodedUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://pluto.tv",
        "Referer": "https://pluto.tv/"
      }
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

  try {
    const upstream = await axios.get(decodedUrl, {
      timeout: 20000,
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://pluto.tv",
        "Referer": "https://pluto.tv/"
      }
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

  // Proxy each stream URL through /hls-canal to avoid CORS issues
  señales = señales.map(s => ({
    ...s,
    url: `${baseUrl}/hls-canal?url=${encodeURIComponent(s.url)}`
  }));

  const señalesJson = JSON.stringify(señales).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

  const tagsPais = canalBandera && canalPais
    ? `<span class="tag tag-pais">${canalBandera} ${canalPais.toUpperCase()}</span>` : "";
  const tagsCat = canalCategorias.map(c => `<span class="tag tag-cat">${c.toUpperCase()}</span>`).join("");
  const tagFuente = canalFuente ? `<span class="tag tag-src">${canalFuente.toUpperCase()}</span>` : "";
  const logoHtml = canalLogo
    ? `<img src="${canalLogo}" alt="${canalNombre}" onerror="this.style.display='none'">` : "";
  const señalesHtml = señales.map((s, i) =>
    `<button class="signal-btn${i===0?" active":""}" onclick="switchStream(${i})">${s.label||"Señal "+(i+1)}</button>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${canalNombre} - EN VIVO</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    :root{--red:#e74c3c;--red2:#c0392b;--bg:#0d0d0d;--card:#161616;--border:#222}
    html,body{width:100%;height:100%;background:var(--bg);font-family:'Segoe UI',Arial,sans-serif;color:#fff;overflow:hidden}

    /* ── Player ── */
    #playerWrap{position:relative;width:100%;height:100%;background:#000}
    video{width:100%;height:100%;object-fit:contain;display:block}

    #loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;z-index:20;gap:14px}
    .spinner{width:48px;height:48px;border:4px solid rgba(255,255,255,.1);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loader p{font-size:13px;color:rgba(255,255,255,.5)}

    #controls{position:absolute;bottom:0;left:0;right:0;padding:0 12px 8px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s;z-index:10}
    #playerWrap:hover #controls,#playerWrap.showCtrl #controls{opacity:1}
    #progressWrap{position:relative;height:18px;cursor:pointer;display:flex;align-items:center;margin-bottom:2px}
    #progressBg{position:absolute;left:0;right:0;height:3px;background:rgba(255,255,255,.2);border-radius:2px}
    #progressWrap:hover #progressBg{height:5px}
    #liveBar{position:absolute;left:0;right:0;height:100%;background:linear-gradient(90deg,rgba(231,76,60,.6),rgba(231,76,60,.2));border-radius:2px}
    #progressFill{position:absolute;left:0;height:100%;background:var(--red);border-radius:2px;width:0%}
    #btnRow{display:flex;align-items:center;gap:8px}
    .btn{background:none;border:none;color:#fff;cursor:pointer;padding:5px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .btn:hover{background:rgba(255,255,255,.12)}
    .btn svg{width:20px;height:20px;fill:currentColor}
    #volSlider{-webkit-appearance:none;appearance:none;width:64px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;outline:none;cursor:pointer}
    #volSlider::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;background:#fff;border-radius:50%;cursor:pointer}
    #timeLabel{font-size:11px;color:rgba(255,255,255,.7);white-space:nowrap;margin-left:2px}
    #spacer{flex:1}
    #qualityLabel{font-size:11px;background:rgba(255,255,255,.15);padding:2px 7px;border-radius:4px;color:rgba(255,255,255,.8)}

    #errOverlay{position:absolute;inset:0;background:rgba(0,0,0,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:30;gap:12px;padding:24px;text-align:center}
    #errOverlay svg{width:48px;height:48px;fill:var(--red);opacity:.8}
    #errOverlay h2{font-size:17px}
    #errOverlay p{font-size:12px;color:rgba(255,255,255,.5);max-width:260px}
    #retryBtn{background:var(--red);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s}
    #retryBtn:hover{background:var(--red2)}

    #tapFx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
    .tapCircle{width:64px;height:64px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.5);transition:opacity .25s,transform .25s;backdrop-filter:blur(4px)}
    .tapCircle.show{opacity:1;transform:scale(1)}
    .tapCircle svg{width:28px;height:28px;fill:#fff}

  </style>
</head>
<body>
<div id="playerWrap">
  <video id="video" playsinline></video>
  <div id="loader"><div class="spinner"></div><p>Conectando al stream...</p></div>
  <div id="tapFx"><div class="tapCircle" id="tapCircle">
    <svg viewBox="0 0 24 24" id="tapIcon"><path d="M8 5v14l11-7z"/></svg>
  </div></div>
  <div id="controls">
    <div id="progressWrap">
      <div id="progressBg"><div id="liveBar" style="display:none"></div><div id="progressFill"></div></div>
    </div>
    <div id="btnRow">
      <button class="btn" id="btnPlay"><svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg></button>
      <button class="btn" id="btnMute"><svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/></svg></button>
      <input type="range" id="volSlider" min="0" max="1" step="0.05" value="1">
      <span id="timeLabel">EN VIVO</span>
      <div id="spacer"></div>
      <span id="qualityLabel">HD</span>
      <button class="btn" id="btnPip" title="PiP" style="display:none"><svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg></button>
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
  var STREAMS = ${señalesJson};
  var currentIdx = 0;
  var video = document.getElementById("video");
  var loader = document.getElementById("loader");
  var errOverlay = document.getElementById("errOverlay");
  var btnPlay = document.getElementById("btnPlay");
  var playIcon = document.getElementById("playIcon");
  var btnMute = document.getElementById("btnMute");
  var volIcon = document.getElementById("volIcon");
  var volSlider = document.getElementById("volSlider");
  var timeLabel = document.getElementById("timeLabel");
  var progressFill = document.getElementById("progressFill");
  var liveBar = document.getElementById("liveBar");
  var qualityLabel = document.getElementById("qualityLabel");
  var btnFs = document.getElementById("btnFs");
  var btnPip = document.getElementById("btnPip");
  var wrap = document.getElementById("playerWrap");
  var tapCircle = document.getElementById("tapCircle");
  var tapIcon = document.getElementById("tapIcon");
  var retries = 0; var maxRetries = 3;
  var hlsInstance = null; var isLive = true; var ctrlTimer;

  var ICONS = {
    play:'<path d="M8 5v14l11-7z"/>',
    pause:'<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    volOn:'<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>',
    volOff:'<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    fsOn:'<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    fsOff:'<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
  };
  function setIcon(el,k){el.innerHTML=ICONS[k];}

  function showLoader(msg){loader.querySelector("p").textContent=msg||"Conectando al stream...";loader.style.display="flex";}
  function hideLoader(){loader.style.display="none";}
  function showError(){errOverlay.style.display="flex";loader.style.display="none";}
  function showCtrl(){wrap.classList.add("showCtrl");clearTimeout(ctrlTimer);ctrlTimer=setTimeout(()=>wrap.classList.remove("showCtrl"),3000);}
  wrap.addEventListener("mousemove",showCtrl);
  wrap.addEventListener("touchstart",showCtrl,{passive:true});

  function togglePlay(){
    if(video.paused){video.play();setIcon(playIcon,"pause");setIcon(tapIcon,"pause");}
    else{video.pause();setIcon(playIcon,"play");setIcon(tapIcon,"play");}
    flashTap();
  }
  btnPlay.addEventListener("click",function(e){e.stopPropagation();togglePlay();});
  video.addEventListener("click",togglePlay);
  video.addEventListener("play",function(){setIcon(playIcon,"pause");});
  video.addEventListener("pause",function(){setIcon(playIcon,"play");});

  var tapTimer;
  function flashTap(){tapCircle.classList.add("show");clearTimeout(tapTimer);tapTimer=setTimeout(()=>tapCircle.classList.remove("show"),600);}

  volSlider.addEventListener("input",function(){video.volume=this.value;video.muted=this.value==0;setIcon(volIcon,video.muted?"volOff":"volOn");});
  btnMute.addEventListener("click",function(){video.muted=!video.muted;volSlider.value=video.muted?0:video.volume;setIcon(volIcon,video.muted?"volOff":"volOn");});

  btnFs.addEventListener("click",function(){
    var el=document.documentElement;
    if(!document.fullscreenElement&&!document.webkitFullscreenElement){(el.requestFullscreen||el.webkitRequestFullscreen).call(el);setIcon(document.getElementById("fsIcon"),"fsOff");}
    else{(document.exitFullscreen||document.webkitExitFullscreen).call(document);setIcon(document.getElementById("fsIcon"),"fsOn");}
  });

  if(document.pictureInPictureEnabled){
    btnPip.style.display="flex";
    btnPip.addEventListener("click",function(){
      if(document.pictureInPictureElement)document.exitPictureInPicture().catch(function(){});
      else video.requestPictureInPicture().catch(function(){});
    });
  }

  function initPlayer(src){
    showLoader(retries>0?"Reintentando... ("+retries+"/"+maxRetries+")":"Conectando al stream...");
    errOverlay.style.display="none";
    if(hlsInstance){hlsInstance.destroy();hlsInstance=null;}
    if(Hls.isSupported()){
      var hls=new Hls({maxBufferLength:20,liveSyncDurationCount:3,manifestLoadingMaxRetry:3,levelLoadingMaxRetry:3,enableWorker:true});
      hlsInstance=hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,function(e,data){
        hideLoader();
        isLive=video.duration===Infinity||isNaN(video.duration);
        if(isLive){liveBar.style.display="block";progressFill.style.width="100%";timeLabel.textContent="EN VIVO";}
        var lvl=hls.levels[hls.currentLevel];
        if(lvl&&lvl.height){qualityLabel.textContent=lvl.height+"p";}
        video.play().catch(function(){});retries=0;
      });
      hls.on(Hls.Events.LEVEL_SWITCHED,function(e,data){
        var lvl=hls.levels[data.level];if(lvl&&lvl.height){qualityLabel.textContent=lvl.height+"p";}
      });
      hls.on(Hls.Events.ERROR,function(e,data){
        if(data.fatal){hls.destroy();hlsInstance=null;
          if(retries<maxRetries){retries++;showLoader("Error, reintentando... ("+retries+"/"+maxRetries+")");setTimeout(function(){initPlayer(STREAMS[currentIdx].url);},3000);}
          else showError();
        }
      });
    } else if(video.canPlayType("application/vnd.apple.mpegurl")){
      video.src=src;
      video.addEventListener("loadedmetadata",function(){hideLoader();video.play().catch(function(){});});
      video.addEventListener("error",function(){if(retries<maxRetries){retries++;setTimeout(function(){initPlayer(STREAMS[currentIdx].url);},3000);}else showError();});
    } else showError();
  }

  window.switchStream=function(idx){
    currentIdx=idx;retries=0;
    document.querySelectorAll(".signal-btn").forEach(function(b,i){b.classList.toggle("active",i===idx);});
    initPlayer(STREAMS[idx].url);
  };

  document.getElementById("retryBtn").addEventListener("click",function(){retries=0;initPlayer(STREAMS[currentIdx].url);});
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
  
  // Si la URL es de un dominio que soporta stream7, redirigir ahí para extracción server-side
  const STREAM7_PLAYER_DOMAINS = ["streamtpnew.com", "streamvipx.com", "bolaloca.my", "capo7play.com", "streamx550.com"];
  if (targetUrl) {
    try {
      const decoded = decodeURIComponent(targetUrl);
      const h = new URL(decoded).hostname;
      if (STREAM7_PLAYER_DOMAINS.some(d => h === d || h.endsWith("." + d))) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const stream7Url = `${baseUrl}/stream7?url=${encodeURIComponent(decoded)}`;
        console.log(`🔀 l3ho → stream7 para ${h}: ${stream7Url}`);
        return res.redirect(302, stream7Url);
      }
    } catch(e) { /* URL inválida, continúa al flujo normal */ }
  }

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
            if (canal.links) {
              if (canal.links.principal) addLink(nombre, localProxy(canal.links.principal), "Rereyano", t.logo1, t.logo2, t.deporte, t.estado, t.hora);
              if (canal.links.backup) addLink(nombre + " (Backup)", localProxy(canal.links.backup), "Rereyano", t.logo1, t.logo2, t.deporte, t.estado, t.hora);
            }
          });
        }
      });
    }
    
    if (trans2 && trans2.transmisiones) {
      trans2.transmisiones.forEach(t => {
        if (t.url) {
          const nombre = t.evento || t.titulo || t.liga || "Transmision";
          addLink(nombre, t.url, "StreamCenter", t.logo1, t.logo2, t.deporte, t.estado, t.hora);
        }
      });
    }
    
    if (trans3 && trans3.transmisiones) {
      trans3.transmisiones.forEach(t => {
        if (t.enlacesDetalle && Array.isArray(t.enlacesDetalle)) {
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

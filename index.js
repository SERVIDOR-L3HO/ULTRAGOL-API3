const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");
const cache = require("./src/cache/dataCache");
const bcrypt = require("bcryptjs");

const {
  sessionConfig,
  loginLimiter,
  apiLimiter,
  securityHeaders,
  isAuthenticated,
  isNotAuthenticated,
  validatePassword,
  createSession,
  destroySession,
  sessionTimeout,
  logAccess
} = require("./src/middleware/auth");
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
const { 
  scrapCanales, 
  scrapCanalesPorPais, 
  scrapCanalesPorCategoria, 
  scrapCanalesDeportes 
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
app.use(sessionTimeout(30 * 60 * 1000));
app.use(logAccess);

app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

let ADMIN_USERS = {};
const initAdminUsers = () => {
  if (!process.env.ADMIN_PASSWORD && !process.env.L3HO_PASSWORD) {
    console.warn('⚠️ ADVERTENCIA: Variables de entorno ADMIN_PASSWORD y L3HO_PASSWORD no configuradas');
    console.warn('⚠️ Usando credenciales temporales solo para desarrollo');
    ADMIN_USERS = {
      'admin': bcrypt.hashSync('temp_dev_pass_' + Date.now(), 12)
    };
  } else {
    if (process.env.ADMIN_PASSWORD) {
      ADMIN_USERS['admin'] = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
    }
    if (process.env.L3HO_PASSWORD) {
      ADMIN_USERS['l3ho'] = bcrypt.hashSync(process.env.L3HO_PASSWORD, 12);
    }
  }
};
initAdminUsers();

app.get('/login', isNotAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    
    const userHash = ADMIN_USERS[username.toLowerCase()];
    
    if (!userHash) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const isValid = await bcrypt.compare(password, userHash);
    
    if (!isValid) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    createSession(req, { username: username.toLowerCase() });
    console.log(`🔐 Login exitoso: ${username} desde IP ${req.ip}`);
    
    res.json({ success: true, message: 'Inicio de sesión exitoso' });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/logout', (req, res) => {
  const username = req.session?.user?.username || 'Unknown';
  destroySession(req, () => {
    console.log(`🔓 Logout: ${username}`);
    res.redirect('/login');
  });
});

app.get('/auth/status', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.json({ 
      authenticated: true, 
      user: req.session.user?.username 
    });
  } else {
    res.json({ authenticated: false });
  }
});

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
    
    // Renderizado simple con diseño mejorado
    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transmisiones Deportivas - Sportsonline</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/all.min.css" rel="stylesheet">
        <style>
            body { background-color: #0f172a; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #334155; padding-bottom: 20px; }
            .event-card { background: #1e293b; border-radius: 12px; margin-bottom: 15px; padding: 20px; border-left: 5px solid #3b82f6; transition: transform 0.2s; }
            .event-card:hover { transform: translateY(-3px); background: #334155; }
            .time { color: #3b82f6; font-weight: bold; font-size: 1.2em; min-width: 80px; }
            .event-name { font-size: 1.1em; margin-left: 20px; flex-grow: 1; }
            .btn-watch { background-color: #3b82f6; color: white; text-decoration: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; float: right; }
            .btn-watch:hover { background-color: #2563eb; color: white; }
            .flex-container { display: flex; align-items: center; }
            .logo { width: 30px; height: 30px; margin-right: 10px; object-fit: contain; }
            .day-header { background: #3b82f6; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 20px 0 10px; font-size: 0.9em; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📺 Transmisiones en Vivo</h1>
                <p>Fuente: Sportsonline.st | Actualizado: ${new Date(data.actualizado).toLocaleString()}</p>
            </div>
            
            <div class="events-list">
    `;
    
    let currentDay = "";
    data.transmisiones.forEach(item => {
      if (item.fecha !== currentDay) {
        currentDay = item.fecha;
        html += `<div class="day-header">${currentDay}</div>`;
      }
      
      html += `
                <div class="event-card">
                    <div class="flex-container">
                        <div class="time">${item.hora}</div>
                        <div class="event-name">
                            ${item.logo1 ? `<img src="${item.logo1}" class="logo" onerror="this.style.display='none'">` : ''}
                            ${item.evento}
                            ${item.logo2 ? `<img src="${item.logo2}" class="logo" onerror="this.style.display='none'">` : ''}
                        </div>
                        <a href="${item.canales[0].url}" target="_blank" class="btn-watch">VER AHORA</a>
                    </div>
                </div>
      `;
    });
    
    html += `
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/transmisiones", async (req, res) => {
  try {
    let data = cache.get("transmisiones");
    
    if (!data) {
      console.log("📺 Obteniendo transmisiones deportivas (caché vacío)...");
      data = await scrapTransmisiones();
      cache.set("transmisiones", data);
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
    
    res.json(data);
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
    
    res.json(data);
  } catch (error) {
    console.error("Error en /transmisiones3:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde e1link.link",
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
    
    res.json(data);
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
    
    res.json(data);
  } catch (error) {
    console.error("Error en /transmisiones6:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener las transmisiones deportivas desde UltraGol API",
      detalles: error.message,
      sugerencia: "El sitio web podría estar bloqueando las peticiones o Cloudflare está activo. Intenta de nuevo más tarde."
    });
  }
});

// === CANALES (fuente: famelack/IPTV-org) ===
app.get("/canales", async (req, res) => {
  try {
    let data = cache.get("canales");
    
    if (!data) {
      console.log("📺 Obteniendo canales desde IPTV-org (fuente famelack) - caché vacío...");
      data = await scrapCanales();
      if (data.success) {
        cache.set("canales", data, 3600); // Cache 1 hora
      }
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
      width: 200px;
      max-width: 35vw;
      height: auto;
      opacity: 0.9;
      transition: opacity 0.3s ease, transform 0.2s ease;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));
    }

    #logo:hover {
      opacity: 1;
      transform: scale(1.05);
    }

    @media (max-width: 600px) {
      #logo {
        width: 140px;
        max-width: 30vw;
      }
      #logo-link {
        top: 5px;
        right: 5px;
      }
    }

    @media (max-width: 400px) {
      #logo {
        width: 110px;
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
    
    const [trans1, trans2, trans3, trans4, trans5, trans6] = await Promise.all([
      scrapTransmisiones().catch(err => { console.error("Error trans1:", err.message); return null; }),
      scrapTransmisiones2().catch(err => { console.error("Error trans2:", err.message); return null; }),
      scrapTransmisiones3().catch(err => { console.error("Error trans3:", err.message); return null; }),
      scrapTransmisiones4().catch(err => { console.error("Error trans4:", err.message); return null; }),
      scrapTransmisiones5().catch(err => { console.error("Error trans5:", err.message); return null; }),
      scrapTransmisiones6().catch(err => { console.error("Error trans6:", err.message); return null; })
    ]);
    
    const allLinks = [];
    const seenUrls = new Set();
    
    const addLink = (name, url, source) => {
      if (!url || !name) return;
      const cleanUrl = url.trim();
      if (seenUrls.has(cleanUrl)) return;
      seenUrls.add(cleanUrl);
      allLinks.push({
        name: name.trim(),
        url: cleanUrl,
        source: source
      });
    };
    
    if (trans1 && trans1.transmisiones) {
      trans1.transmisiones.forEach(t => {
        if (t.canales && Array.isArray(t.canales)) {
          t.canales.forEach(canal => {
            const nombre = `${t.evento} - ${canal.nombre}`;
            if (canal.links) {
              if (canal.links.hoca) addLink(nombre + " (Hoca)", canal.links.hoca, "Rereyano");
              if (canal.links.caster) addLink(nombre + " (Caster)", canal.links.caster, "Rereyano");
              if (canal.links.wigi) addLink(nombre + " (Wigi)", canal.links.wigi, "Rereyano");
            }
          });
        }
      });
    }
    
    if (trans2 && trans2.transmisiones) {
      trans2.transmisiones.forEach(t => {
        if (t.url) {
          const nombre = t.evento || t.titulo || t.liga || "Transmision";
          addLink(nombre, t.url, "Mycraft");
        }
      });
    }
    
    if (trans3 && trans3.transmisiones) {
      trans3.transmisiones.forEach(t => {
        if (t.enlace) {
          const nombre = t.evento || t.canal || "Transmision";
          addLink(nombre, t.enlace, "E1Link");
        }
        if (t.enlaces && Array.isArray(t.enlaces)) {
          t.enlaces.forEach((enlace, i) => {
            const nombre = `${t.evento || t.canal || "Transmision"} - Opcion ${i + 1}`;
            addLink(nombre, enlace, "E1Link");
          });
        }
      });
    }
    
    if (trans4 && trans4.transmisiones) {
      trans4.transmisiones.forEach(t => {
        if (t.enlace || t.url) {
          const nombre = t.evento || t.equipos || t.canal || "Transmision";
          addLink(nombre, t.enlace || t.url, "FTVHD");
        }
        if (t.canales && Array.isArray(t.canales)) {
          t.canales.forEach(canal => {
            if (canal.enlace || canal.url) {
              const nombre = `${t.evento || t.equipos || "Transmision"} - ${canal.nombre || canal.canal || "Canal"}`;
              addLink(nombre, canal.enlace || canal.url, "FTVHD");
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
                    addLink(nombre, link, "DonRomans");
                  } else if (link && link.url) {
                    const nombre = `${match.title || "Transmision"} - ${link.name || linkGroup.type || ""} ${i + 1}`;
                    addLink(nombre, link.url, "DonRomans");
                  } else if (link && typeof link === 'object') {
                    Object.values(link).forEach((v, j) => {
                      if (typeof v === 'string' && v.startsWith('http')) {
                        const nombre = `${match.title || "Transmision"} - ${linkGroup.type || ""} ${i + 1}.${j + 1}`;
                        addLink(nombre, v, "DonRomans");
                      }
                    });
                  }
                });
              } else if (typeof linkGroup.data === 'object') {
                Object.entries(linkGroup.data).forEach(([key, value]) => {
                  if (typeof value === 'string' && value.startsWith('http')) {
                    const nombre = `${match.title || "Transmision"} - ${key}`;
                    addLink(nombre, value, "DonRomans");
                  } else if (Array.isArray(value)) {
                    value.forEach((v, i) => {
                      if (typeof v === 'string' && v.startsWith('http')) {
                        const nombre = `${match.title || "Transmision"} - ${key} ${i + 1}`;
                        addLink(nombre, v, "DonRomans");
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Multi-League Football API activa en puerto ${PORT}`);
  console.log(`📡 Actualizaciones automáticas cada 20 minutos`);
  console.log(`⚽ Ligas disponibles: Liga MX, Premier League, La Liga, Serie A, Bundesliga, Ligue 1`);
  console.log(`🔗 Accede a "/" para ver todos los endpoints disponibles`);
});

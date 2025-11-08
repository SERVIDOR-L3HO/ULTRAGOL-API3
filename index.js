const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");
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

const app = express();

app.use(cors());

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
  res.json({
    nombre: "Multi-League Football API",
    version: "3.4.0",
    descripcion: "API con scraping en tiempo real de múltiples ligas de fútbol + Marcadores en vivo desde ESPN",
    actualizacion: "Datos actualizados automáticamente cada 20 minutos",
    novedades: "🔔 NUEVO: Sistema inteligente de notificaciones con detección automática de GOLES, INICIO DE PARTIDO y FIN DEL PRIMER TIEMPO en tiempo real",
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
          marcadores: "/marcadores (⚽ NUEVO - Tiempo Real)",
          alineaciones: "/alineaciones (⚽ NUEVO - Multi-fuente con fotos)",
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
          marcadores: "/premier/marcadores (⚽ NUEVO - Tiempo Real)",
          alineaciones: "/premier/alineaciones (⚽ NUEVO)",
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
          marcadores: "/laliga/marcadores (⚽ NUEVO - Tiempo Real)",
          alineaciones: "/laliga/alineaciones (⚽ NUEVO)",
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
          marcadores: "/seriea/marcadores (⚽ NUEVO - Tiempo Real)",
          alineaciones: "/seriea/alineaciones (⚽ NUEVO)",
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
          marcadores: "/bundesliga/marcadores (⚽ NUEVO - Tiempo Real)",
          alineaciones: "/bundesliga/alineaciones (⚽ NUEVO)",
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
          marcadores: "/ligue1/marcadores (⚽ NUEVO - Tiempo Real)",
          alineaciones: "/ligue1/alineaciones (⚽ NUEVO)",
          mejoresMomentos: "/ligue1/mejores-momentos"
        }
      }
    },
    endpoints_especiales: {
      todas_las_ligas: {
        calendario: "/calendario/todas-las-ligas",
        marcadores: "/marcadores/todas-las-ligas (⚽ NUEVO)",
        alineaciones: "/alineaciones/todas-las-ligas (⚽ NUEVO - Multi-fuente)",
        descripcion: "Calendario, marcadores y alineaciones completas de todas las ligas"
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
        todas: "/notificaciones (🔔 ACTUALIZADO)",
        porLiga: "/notificaciones/:liga",
        estadisticas: "/notificaciones/stats",
        descripcion: "Sistema inteligente de notificaciones - Detecta GOLES en tiempo real ⚽, INICIO DE PARTIDO 🏁, FIN DEL PRIMER TIEMPO ⏸️, partidos en vivo, próximos a iniciar (15min, 30min, 1h, 2h) y partidos del día",
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
        descripcion: "✨ NUEVO ✨ Transmisiones deportivas de e1link.link - Fuente alternativa con HOCKEY, FOOTBALL/SOCCER, BASKETBALL, AMERICAN FOOTBALL, MOTORSPORT. Incluye canal, ID y enlaces directos"
      },
      getStreamUrl: {
        endpoint: "/getStreamUrl",
        parametro: "?url=https://rereyano.ru/player/3/1",
        descripcion: "Extrae la URL del reproductor de video en formato JSON - úsala directamente en tu iframe",
        respuesta: "{ success: true, playerUrl: 'https://...', type: 'iframe' }"
      },
      proxyStream: {
        endpoint: "/proxyStream",
        parametro: "?url=https://rereyano.ru/player/3/1",
        descripcion: "Proxy limpiador de HTML para streams de video - elimina anuncios y pop-ups, extrae solo el reproductor de video"
      },
      parametros_marcadores: {
        date: "?date=YYYYMMDD (opcional)",
        ejemplo: "/marcadores?date=20251021",
        descripcion: "Obtener marcadores de una fecha específica en formato YYYYMMDD"
      }
    },
    estado: "✅ Activo",
    proxima_actualizacion: "20 minutos"
  });
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

app.get("/getStreamUrl", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ 
        error: "Falta el parámetro 'url'",
        ejemplo: "/getStreamUrl?url=https://rereyano.ru/player/3/1"
      });
    }

    console.log(`🔍 Extrayendo URL del stream: ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const iframe = $('iframe').first();
    const iframeSrc = iframe.attr('src') || '';

    if (iframe.length > 0 && iframeSrc) {
      const fullUrl = iframeSrc.startsWith('http') ? iframeSrc : `https:${iframeSrc}`;
      
      res.json({
        success: true,
        playerUrl: fullUrl,
        type: 'iframe',
        originalUrl: targetUrl
      });
      
      console.log(`✅ URL extraída: ${fullUrl}`);
    } else {
      res.status(404).json({
        success: false,
        error: "No se encontró un reproductor de video en la página",
        originalUrl: targetUrl
      });
    }

  } catch (error) {
    console.error("❌ Error en /getStreamUrl:", error.message);
    res.status(500).json({ 
      success: false,
      error: "No se pudo procesar la URL",
      detalles: error.message 
    });
  }
});

app.get("/proxyStream", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ 
        error: "Falta el parámetro 'url'",
        ejemplo: "/proxyStream?url=https://rereyano.ru/player/3/1"
      });
    }

    console.log(`🎥 Proxy solicitado para: ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    $('script').remove();
    $('noscript').remove();
    
    $('a').each((i, elem) => {
      $(elem).removeAttr('href');
      $(elem).removeAttr('onclick');
    });

    $('iframe').each((i, elem) => {
      const iframeSrc = $(elem).attr('src') || '';
      if (
        iframeSrc.toLowerCase().includes('ads') ||
        iframeSrc.toLowerCase().includes('adservice') ||
        iframeSrc.toLowerCase().includes('pop') ||
        iframeSrc.toLowerCase().includes('click') ||
        iframeSrc.toLowerCase().includes('banner')
      ) {
        $(elem).remove();
      }
    });

    $('div, span, section, aside').each((i, elem) => {
      const elemId = $(elem).attr('id') || '';
      const elemClass = $(elem).attr('class') || '';
      const combined = (elemId + ' ' + elemClass).toLowerCase();
      
      if (
        combined.includes('ad') ||
        combined.includes('banner') ||
        combined.includes('popup') ||
        combined.includes('overlay') ||
        combined.includes('modal')
      ) {
        $(elem).remove();
      }
    });

    const iframe = $('iframe').first();
    const iframeSrc = iframe.attr('src') || '';
    
    let cleanHtml;

    if (iframe.length > 0 && iframeSrc) {
      const fullIframeSrc = iframeSrc.startsWith('http') ? iframeSrc : `https:${iframeSrc}`;
      
      cleanHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="script-src 'none';">
  <title>Stream Player</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #000;
    }
    iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
    a {
      pointer-events: none;
      cursor: default;
    }
  </style>
</head>
<body>
  <iframe 
    src="${fullIframeSrc}" 
    width="100%" 
    height="100%" 
    scrolling="no" 
    frameborder="0" 
    allowfullscreen="true"
    sandbox="allow-same-origin allow-scripts allow-forms">
  </iframe>
</body>
</html>`;
      
      console.log(`✅ Iframe extraído: ${fullIframeSrc}`);
    } else {
      const video = $('video').first();
      
      if (video.length > 0) {
        cleanHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Player</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #000;
    }
    video {
      max-width: 100%;
      max-height: 100vh;
    }
  </style>
</head>
<body>
  ${$.html(video)}
</body>
</html>`;
      } else {
        cleanHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sin contenido</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #1a1a1a;
      color: #fff;
      font-family: Arial, sans-serif;
    }
    .message {
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="message">
    <h2>⚠️ No se encontró contenido de video</h2>
    <p>La página no contiene un reproductor de video válido.</p>
  </div>
</body>
</html>`;
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "script-src 'none'");
    res.send(cleanHtml);

    console.log(`✅ Proxy completado para: ${targetUrl}`);

  } catch (error) {
    console.error("❌ Error en /proxyStream:", error.message);
    
    const errorHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #1a1a1a;
      color: #fff;
      font-family: Arial, sans-serif;
    }
    .error {
      text-align: center;
      padding: 20px;
      max-width: 600px;
    }
    .error-code {
      color: #ff4444;
      font-size: 18px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h2>❌ Error al cargar el contenido</h2>
    <p>No se pudo acceder a la URL proporcionada.</p>
    <div class="error-code">${error.message}</div>
  </div>
</body>
</html>`;
    
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorHtml);
  }
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

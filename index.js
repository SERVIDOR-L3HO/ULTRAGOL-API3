const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
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

const { scrapTablaLaLiga } = require("./src/scrapers/laliga/tabla");
const { scrapNoticiasLaLiga } = require("./src/scrapers/laliga/noticias");
const { scrapGoleadoresLaLiga } = require("./src/scrapers/laliga/goleadores");
const { scrapCalendarioLaLiga } = require("./src/scrapers/laliga/calendario");

const { scrapTablaSerieA } = require("./src/scrapers/seriea/tabla");
const { scrapNoticiasSerieA } = require("./src/scrapers/seriea/noticias");
const { scrapGoleadoresSerieA } = require("./src/scrapers/seriea/goleadores");
const { scrapCalendarioSerieA } = require("./src/scrapers/seriea/calendario");

const { scrapTablaBundesliga } = require("./src/scrapers/bundesliga/tabla");
const { scrapNoticiasBundesliga } = require("./src/scrapers/bundesliga/noticias");
const { scrapGoleadoresBundesliga } = require("./src/scrapers/bundesliga/goleadores");
const { scrapCalendarioBundesliga } = require("./src/scrapers/bundesliga/calendario");

const { scrapTablaLigue1 } = require("./src/scrapers/ligue1/tabla");
const { scrapNoticiasLigue1 } = require("./src/scrapers/ligue1/noticias");
const { scrapGoleadoresLigue1 } = require("./src/scrapers/ligue1/goleadores");
const { scrapCalendarioLigue1 } = require("./src/scrapers/ligue1/calendario");

const { scrapTransmisiones } = require("./src/scrapers/transmisiones");

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

app.get("/", (req, res) => {
  res.json({
    nombre: "Multi-League Football API",
    version: "3.1.0",
    descripcion: "API con scraping en tiempo real de múltiples ligas de fútbol",
    actualizacion: "Datos actualizados automáticamente cada 20 minutos",
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
          todo: "/todo"
        }
      },
      premierLeague: {
        nombre: "Premier League",
        endpoints: {
          tabla: "/premier/tabla",
          noticias: "/premier/noticias",
          goleadores: "/premier/goleadores",
          calendario: "/premier/calendario"
        }
      },
      laLiga: {
        nombre: "La Liga",
        endpoints: {
          tabla: "/laliga/tabla",
          noticias: "/laliga/noticias",
          goleadores: "/laliga/goleadores",
          calendario: "/laliga/calendario"
        }
      },
      serieA: {
        nombre: "Serie A",
        endpoints: {
          tabla: "/seriea/tabla",
          noticias: "/seriea/noticias",
          goleadores: "/seriea/goleadores",
          calendario: "/seriea/calendario"
        }
      },
      bundesliga: {
        nombre: "Bundesliga",
        endpoints: {
          tabla: "/bundesliga/tabla",
          noticias: "/bundesliga/noticias",
          goleadores: "/bundesliga/goleadores",
          calendario: "/bundesliga/calendario"
        }
      },
      ligue1: {
        nombre: "Ligue 1",
        endpoints: {
          tabla: "/ligue1/tabla",
          noticias: "/ligue1/noticias",
          goleadores: "/ligue1/goleadores",
          calendario: "/ligue1/calendario"
        }
      }
    },
    endpoints_especiales: {
      todas_las_ligas: {
        calendario: "/calendario/todas-las-ligas",
        descripcion: "Calendario completo de todas las jornadas de todas las ligas con información detallada"
      },
      transmisiones: {
        endpoint: "/transmisiones",
        descripcion: "Transmisiones deportivas en vivo con fechas, horarios y canales disponibles"
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

updateAllData();

cron.schedule("*/20 * * * *", () => {
  console.log("⏰ Actualización programada iniciada");
  updateAllData();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Multi-League Football API activa en puerto ${PORT}`);
  console.log(`📡 Actualizaciones automáticas cada 20 minutos`);
  console.log(`⚽ Ligas disponibles: Liga MX, Premier League, La Liga, Serie A, Bundesliga, Ligue 1`);
  console.log(`🔗 Accede a "/" para ver todos los endpoints disponibles`);
});

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
const { scrapPartidos } = require("./src/scrapers/partidos");

const { scrapTablaPremier } = require("./src/scrapers/premier/tabla");
const { scrapNoticiasPremier } = require("./src/scrapers/premier/noticias");
const { scrapGoleadoresPremier } = require("./src/scrapers/premier/goleadores");
const { scrapPartidosPremier } = require("./src/scrapers/premier/partidos");

const { scrapTablaLaLiga } = require("./src/scrapers/laliga/tabla");
const { scrapNoticiasLaLiga } = require("./src/scrapers/laliga/noticias");
const { scrapGoleadoresLaLiga } = require("./src/scrapers/laliga/goleadores");
const { scrapPartidosLaLiga } = require("./src/scrapers/laliga/partidos");

const { scrapTablaSerieA } = require("./src/scrapers/seriea/tabla");
const { scrapNoticiasSerieA } = require("./src/scrapers/seriea/noticias");
const { scrapGoleadoresSerieA } = require("./src/scrapers/seriea/goleadores");
const { scrapPartidosSerieA } = require("./src/scrapers/seriea/partidos");

const { scrapTablaBundesliga } = require("./src/scrapers/bundesliga/tabla");
const { scrapNoticiasBundesliga } = require("./src/scrapers/bundesliga/noticias");
const { scrapGoleadoresBundesliga } = require("./src/scrapers/bundesliga/goleadores");
const { scrapPartidosBundesliga } = require("./src/scrapers/bundesliga/partidos");

const { scrapTablaLigue1 } = require("./src/scrapers/ligue1/tabla");
const { scrapNoticiasLigue1 } = require("./src/scrapers/ligue1/noticias");
const { scrapGoleadoresLigue1 } = require("./src/scrapers/ligue1/goleadores");
const { scrapPartidosLigue1 } = require("./src/scrapers/ligue1/partidos");

const app = express();

app.use(cors());

async function updateAllData() {
  console.log("🔄 Actualizando datos de Liga MX...");
  
  try {
    const [tabla, noticias, goleadores, equipos, logos, videos, partidos] = await Promise.all([
      scrapTabla().catch(err => { console.error("Error en tabla:", err.message); return null; }),
      scrapNoticias().catch(err => { console.error("Error en noticias:", err.message); return null; }),
      scrapGoleadores().catch(err => { console.error("Error en goleadores:", err.message); return null; }),
      scrapEquipos().catch(err => { console.error("Error en equipos:", err.message); return null; }),
      scrapLogos().catch(err => { console.error("Error en logos:", err.message); return null; }),
      scrapVideos().catch(err => { console.error("Error en videos:", err.message); return null; }),
      scrapPartidos().catch(err => { console.error("Error en partidos:", err.message); return null; })
    ]);
    
    if (tabla) cache.set("tabla", tabla);
    if (noticias) cache.set("noticias", noticias);
    if (goleadores) cache.set("goleadores", goleadores);
    if (equipos) cache.set("equipos", equipos);
    if (logos) cache.set("logos", logos);
    if (videos) cache.set("videos", videos);
    if (partidos) cache.set("partidos", partidos);
    
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
    actualizacion: "Datos actualizados automáticamente cada 30 minutos",
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
          partidos: "/partidos",
          todo: "/todo"
        }
      },
      premierLeague: {
        nombre: "Premier League",
        endpoints: {
          tabla: "/premier/tabla",
          noticias: "/premier/noticias",
          goleadores: "/premier/goleadores",
          partidos: "/premier/partidos"
        }
      },
      laLiga: {
        nombre: "La Liga",
        endpoints: {
          tabla: "/laliga/tabla",
          noticias: "/laliga/noticias",
          goleadores: "/laliga/goleadores",
          partidos: "/laliga/partidos"
        }
      },
      serieA: {
        nombre: "Serie A",
        endpoints: {
          tabla: "/seriea/tabla",
          noticias: "/seriea/noticias",
          goleadores: "/seriea/goleadores",
          partidos: "/seriea/partidos"
        }
      },
      bundesliga: {
        nombre: "Bundesliga",
        endpoints: {
          tabla: "/bundesliga/tabla",
          noticias: "/bundesliga/noticias",
          goleadores: "/bundesliga/goleadores",
          partidos: "/bundesliga/partidos"
        }
      },
      ligue1: {
        nombre: "Ligue 1",
        endpoints: {
          tabla: "/ligue1/tabla",
          noticias: "/ligue1/noticias",
          goleadores: "/ligue1/goleadores",
          partidos: "/ligue1/partidos"
        }
      }
    },
    estado: "✅ Activo",
    proxima_actualizacion: "30 minutos"
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

app.get("/partidos", async (req, res) => {
  try {
    let data = cache.get("partidos");
    
    if (!data) {
      console.log("📅 Obteniendo próximos partidos (caché vacío)...");
      data = await scrapPartidos();
      cache.set("partidos", data);
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error en /partidos:", error.message);
    res.status(500).json({ 
      error: "No se pudieron obtener los próximos partidos",
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
    const partidos = cache.get("partidos") || await scrapPartidos().catch(() => null);
    
    res.json({
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      tabla: tabla,
      noticias: noticias,
      goleadores: goleadores,
      equipos: equipos,
      logos: logos,
      videos: videos,
      partidos: partidos
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

app.get("/premier/partidos", async (req, res) => {
  try {
    let data = cache.get("premier_partidos");
    if (!data) {
      console.log("📅 Obteniendo próximos partidos Premier League...");
      data = await scrapPartidosPremier();
      cache.set("premier_partidos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /premier/partidos:", error.message);
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

app.get("/laliga/partidos", async (req, res) => {
  try {
    let data = cache.get("laliga_partidos");
    if (!data) {
      console.log("📅 Obteniendo próximos partidos La Liga...");
      data = await scrapPartidosLaLiga();
      cache.set("laliga_partidos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /laliga/partidos:", error.message);
    res.status(500).json({ error: "No se pudieron obtener los próximos partidos de La Liga", detalles: error.message });
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

app.get("/seriea/partidos", async (req, res) => {
  try {
    let data = cache.get("seriea_partidos");
    if (!data) {
      console.log("📅 Obteniendo próximos partidos Serie A...");
      data = await scrapPartidosSerieA();
      cache.set("seriea_partidos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /seriea/partidos:", error.message);
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

app.get("/bundesliga/partidos", async (req, res) => {
  try {
    let data = cache.get("bundesliga_partidos");
    if (!data) {
      console.log("📅 Obteniendo próximos partidos Bundesliga...");
      data = await scrapPartidosBundesliga();
      cache.set("bundesliga_partidos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /bundesliga/partidos:", error.message);
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

app.get("/ligue1/partidos", async (req, res) => {
  try {
    let data = cache.get("ligue1_partidos");
    if (!data) {
      console.log("📅 Obteniendo próximos partidos Ligue 1...");
      data = await scrapPartidosLigue1();
      cache.set("ligue1_partidos", data);
    }
    res.json(data);
  } catch (error) {
    console.error("Error en /ligue1/partidos:", error.message);
    res.status(500).json({ error: "Impossible d'obtenir les prochains matchs de Ligue 1", detalles: error.message });
  }
});

updateAllData();

cron.schedule("*/30 * * * *", () => {
  console.log("⏰ Actualización programada iniciada");
  updateAllData();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Multi-League Football API activa en puerto ${PORT}`);
  console.log(`📡 Actualizaciones automáticas cada 30 minutos`);
  console.log(`⚽ Ligas disponibles: Liga MX, Premier League, La Liga, Serie A, Bundesliga, Ligue 1`);
  console.log(`🔗 Accede a "/" para ver todos los endpoints disponibles`);
});

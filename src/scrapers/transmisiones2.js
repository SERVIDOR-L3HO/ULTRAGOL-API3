const axios = require("axios");

const API_URL = "https://api.goleafutbol.com/api/channels";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.goleafutbol.com/",
  "Accept": "application/json"
};

function decodeStreamUrl(raw) {
  if (!raw) return null;
  try {
    const match = raw.match(/[?&]r=([^&]+)/);
    if (match) return Buffer.from(match[1], "base64").toString("utf8");
    return raw;
  } catch {
    return raw;
  }
}

async function scrapTransmisiones2() {
  try {
    console.log("📺 Obteniendo canales desde api.goleafutbol.com...");

    const response = await axios.get(API_URL, { headers: HEADERS, timeout: 15000 });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Respuesta inesperada de api.goleafutbol.com");
    }

    const canales = response.data;
    const categorias = {};
    const transmisiones = [];

    canales.forEach(canal => {
      const { name, id, category, logo, backups } = canal;
      if (!name || !id) return;

      const streamUrl = decodeStreamUrl(id);
      const backupUrls = (backups || []).map(decodeStreamUrl).filter(Boolean);

      const cat = category || "Canales";
      categorias[cat] = (categorias[cat] || 0) + 1;

      const entrada = {
        nombre: name,
        evento: name,
        categoria: cat,
        logo: logo || null,
        url: streamUrl,
        canales: [
          { nombre: "Principal", url: streamUrl },
          ...backupUrls.map((u, i) => ({ nombre: `Backup ${i + 1}`, url: u }))
        ]
      };

      transmisiones.push(entrada);
    });

    console.log(`✅ goleafutbol.com: ${transmisiones.length} canales obtenidos`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "goleafutbol.com",
      categorias,
      categoriasDisponibles: Object.keys(categorias),
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (goleafutbol.com):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "goleafutbol.com",
      error: `Error obteniendo canales: ${error.message}`,
      categorias: {},
      categoriasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

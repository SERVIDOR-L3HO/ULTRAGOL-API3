const axios = require("axios");

const API_URL = "https://api.goleafutbol.com/api/agenda";
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

function extractTeams(title) {
  const clean = title.replace(/^[^:]+:\s*/, "").trim();
  const sep = clean.match(/\s+vs\.?\s+/i);
  if (sep) {
    const idx = clean.search(/\s+vs\.?\s+/i);
    const equipo1 = clean.slice(0, idx).trim();
    const equipo2 = clean.slice(idx + sep[0].length).trim();
    return { equipo1, equipo2 };
  }
  return { equipo1: clean, equipo2: "" };
}

async function scrapTransmisiones2() {
  try {
    console.log("📺 Obteniendo agenda de partidos desde goleafutbol.com...");

    const response = await axios.get(API_URL, { headers: HEADERS, timeout: 15000 });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Respuesta inesperada de api.goleafutbol.com/api/agenda");
    }

    const eventos = response.data;
    const ligas = {};
    const transmisiones = [];

    eventos.forEach(evento => {
      const { title, time, category, language, status, date, channels } = evento;
      if (!title) return;

      const { equipo1, equipo2 } = extractTeams(title);
      const liga = category || "Deportes";

      ligas[liga] = (ligas[liga] || 0) + 1;

      const canales = (channels || []).map(c => ({
        nombre: c.name,
        calidad: c.quality || "720p",
        url: decodeStreamUrl(c.url),
        channelId: c.channelId
      })).filter(c => c.url);

      transmisiones.push({
        titulo: title,
        evento: title,
        equipo1,
        equipo2,
        liga,
        deporte: liga,
        hora: time || "",
        fecha: date || "",
        idioma: language || "Español",
        estado: status === "EN VIVO" ? "EN VIVO" : status === "PROXIMO" ? "Próximo" : status || "Programado",
        canales
      });
    });

    console.log(`✅ goleafutbol.com/agenda: ${transmisiones.length} partidos con ${Object.keys(ligas).join(", ")}`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "goleafutbol.com",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (goleafutbol.com):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "goleafutbol.com",
      error: `Error obteniendo agenda: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

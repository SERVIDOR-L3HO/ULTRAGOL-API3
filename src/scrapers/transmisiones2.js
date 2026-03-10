const axios = require("axios");

const GLZ_PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";

const CATEGORIES_MAP = {
  4:  'Baloncesto',
  9:  'Fútbol',
  13: 'Béisbol',
  14: 'Fútbol Americano',
  15: 'Automovilismo',
  16: 'Hockey',
  17: 'MMA',
  18: 'Boxeo',
  19: 'NCAA',
  20: 'WWE'
};

const API_BASE = "https://backend.streamcenter.live/api";
const HEADERS = {
  "Accept": "application/json",
  "Origin": "https://streamcenter.live",
  "Referer": "https://streamcenter.live/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

function parseBeginPartie(isoStr) {
  if (!isoStr) return { hora: "Por confirmar", estado: "Programado" };

  const eventDate = new Date(isoStr + "Z");
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const diffMins = diffMs / (1000 * 60);

  let estado = "Programado";
  if (diffMins <= 0 && diffMins > -180) {
    estado = "En vivo";
  } else if (diffMins > 0 && diffMins <= 30) {
    estado = "Por comenzar";
  }

  const hora = eventDate.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  });

  return { hora, estado };
}

function parseTeamsFromName(name) {
  const separadores = [' vs ', ' vs. ', ' - ', ' x ', ' @ '];
  for (const sep of separadores) {
    if (name.includes(sep)) {
      const parts = name.split(sep);
      return { equipo1: parts[0].trim(), equipo2: parts[1].trim() };
    }
  }
  return { equipo1: name, equipo2: '' };
}

function parseVideoUrl(rawUrl) {
  if (!rawUrl) return null;
  const angleBracket = rawUrl.indexOf('<');
  if (angleBracket !== -1) {
    return rawUrl.substring(0, angleBracket).trim();
  }
  return rawUrl.trim();
}

async function scrapTransmisiones2() {
  try {
    const response = await axios.get(`${API_BASE}/Parties?pageNumber=1&pageSize=500`, {
      headers: HEADERS,
      timeout: 20000
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Respuesta inesperada de la API de streamcenter.live");
    }

    const events = response.data;
    const transmisiones = [];
    const deportes = {};

    events.forEach((event, index) => {
      try {
        const { id, name, categoryId, logoTeam1, logoTeam2, videoUrl, beginPartie } = event;

        if (!name || !videoUrl) return;

        const streamUrl = parseVideoUrl(videoUrl);
        if (!streamUrl) return;

        const deporte = CATEGORIES_MAP[categoryId] || 'Deportes';
        const { hora, estado } = parseBeginPartie(beginPartie);
        const { equipo1, equipo2 } = parseTeamsFromName(name);

        if (!deportes[deporte]) deportes[deporte] = 0;
        deportes[deporte]++;

        transmisiones.push({
          hora,
          deporte,
          info: deporte,
          liga: deporte,
          titulo: name,
          evento: name,
          equipo1,
          equipo2,
          logo1: logoTeam1 || null,
          logo2: logoTeam2 || null,
          url: GLZ_PROXY + encodeURIComponent(streamUrl),
          urlOriginal: streamUrl,
          estado,
          id
        });
      } catch (err) {
        console.error(`Error procesando evento ${index}:`, err.message);
      }
    });

    console.log(`📺 Transmisiones2 (streamcenter.live) procesadas: ${transmisiones.length}`);
    console.log(`🏆 Deportes disponibles: ${Object.keys(deportes).join(", ")}`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "streamcenter.live",
      deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (streamcenter.live):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "streamcenter.live",
      error: `Error obteniendo transmisiones: ${error.message}`,
      deportes: {},
      deportesDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

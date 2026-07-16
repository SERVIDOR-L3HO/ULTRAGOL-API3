const axios = require("axios");

const API_URL  = "https://golxu.com/craftcurlid.php";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

let _cache   = null;
let _cacheTs = 0;

const categoriaMap = {
  "SOCCER":           "Fútbol",
  "FOOTBALL":         "Fútbol",
  "BASKETBALL":       "Baloncesto",
  "TENNIS":           "Tenis",
  "BASEBALL":         "Béisbol",
  "HOCKEY":           "Hockey",
  "VOLLEYBALL":       "Voleibol",
  "RUGBY":            "Rugby",
  "BOXING":           "Boxeo",
  "MMA":              "MMA",
  "UFC":              "UFC",
  "AMERICAN FOOTBALL":"Fútbol Americano",
  "MOTORSPORT":       "Automovilismo",
  "F1":               "Fórmula 1",
  "CYCLING":          "Ciclismo",
  "GOLF":             "Golf",
  "CRICKET":          "Cricket",
  "ESPORTS":          "E-Sports",
  "DARTS":            "Dardos",
  "SNOOKER":          "Snooker",
  "OTHER":            "Otros"
};

// "20:00 UTC -5"  →  Date en UTC real
function parseHoraUtc(horaStr) {
  try {
    const m = horaStr.match(/^(\d{1,2}):(\d{2})\s*UTC\s*([-+]\d+)/i);
    if (!m) return null;
    const [, hh, mm, off] = m;
    const offsetMs = parseInt(off) * 60 * 60 * 1000;
    const today = new Date();
    const utc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
                         parseInt(hh), parseInt(mm), 0) - offsetMs;
    return new Date(utc);
  } catch { return null; }
}

function calcEstado(fecha) {
  if (!fecha) return "PROXIMO";
  const diffMin = (Date.now() - fecha.getTime()) / 60000;
  if (diffMin > 150)  return "FINALIZADO";
  if (diffMin >= -5)  return "EN VIVO";
  return "PROXIMO";
}

async function scrapTransmisiones6() {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log("gol-6 (golxu): usando cache");
    return _cache;
  }

  try {
    console.log("📺 Obteniendo agenda desde golxu.com/craftcurlid.php...");

    const res = await axios.get(`${API_URL}?cb=${now}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer":    "https://golxu.com/agendapiid.php",
        "Accept":     "application/json, */*"
      },
      timeout: 15000
    });

    const items = Array.isArray(res.data) ? res.data : [];
    const deportes = {};
    const transmisiones = [];

    for (const item of items) {
      const horaStr   = (item.hora   || "").trim();
      const titulo    = (item.titulo || "Evento desconocido").trim();
      const categoria = (item.categoria || "OTHER").trim().toUpperCase();
      const info      = (item.info   || "").trim();
      const link      = item.link    || null;

      if (!link) continue;

      const fecha  = parseHoraUtc(horaStr);
      const estado = calcEstado(fecha);
      const deporte = categoriaMap[categoria] || categoria;

      deportes[deporte] = (deportes[deporte] || 0) + 1;

      const horaLocal = fecha
        ? fecha.toLocaleString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false })
        : horaStr;

      const partes  = titulo.split(/\s*[-–vs]+\s*/i);
      const equipo1 = partes[0]?.trim() || titulo;
      const equipo2 = partes[1]?.trim() || "";

      transmisiones.push({
        titulo,
        competicion: info,
        deporte,
        hora:   horaLocal,
        horaOriginal: horaStr,
        estado,
        equipo1,
        equipo2,
        link
      });
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, "PROXIMO": 1, "FINALIZADO": 2 };
      const diff  = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      return diff !== 0 ? diff : a.hora.localeCompare(b.hora);
    });

    console.log(`✅ gol-6 (golxu): ${transmisiones.length} eventos obtenidos`);

    const result = {
      total:       transmisiones.length,
      enVivo:      transmisiones.filter(t => t.estado === "EN VIVO").length,
      proximos:    transmisiones.filter(t => t.estado === "PROXIMO").length,
      actualizado: new Date().toISOString(),
      fuente:      "golxu.com",
      deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones
    };

    _cache   = result;
    _cacheTs = now;
    return result;

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones6 (golxu):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "golxu.com",
      error: `Error obteniendo eventos: ${error.message}`,
      deportes: {},
      deportesDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones6 };

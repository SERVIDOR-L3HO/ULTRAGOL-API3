const axios = require("axios");

const AGENDA_URL = "https://la18hd.su/eventos/json/agenda123.json";
const CACHE_TTL  = 10 * 60 * 1000;

let _cache   = null;
let _cacheTs = 0;

function calcEstado(timeStr, dateStr) {
  try {
    const now = new Date();
    const eventDate = new Date(`${dateStr}T${timeStr}:00`);
    const diffMin = (now - eventDate) / 60000;
    if (diffMin > 150)  return "FINALIZADO";
    if (diffMin >= -5)  return "EN VIVO";
    return "PROXIMO";
  } catch {
    return "PROXIMO";
  }
}

async function scrapTransmisiones2() {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log("gol-2 (la18hd): usando cache");
    return _cache;
  }

  try {
    console.log("📺 Obteniendo eventos desde la18hd.su/eventos/json/agenda123.json...");

    const res = await axios.get(AGENDA_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://la18hd.su/eventos/",
        "Accept": "application/json, */*"
      },
      timeout: 15000
    });

    const items = Array.isArray(res.data) ? res.data : [];
    const ligas = {};
    const transmisiones = [];

    for (const item of items) {
      const titulo    = (item.title   || "Evento desconocido").trim();
      const hora      = (item.time    || "00:00").substring(0, 5);
      const fecha     = item.date     || new Date().toISOString().split("T")[0];
      const categoria = item.category || "Deportes";
      const link      = item.link     || null;
      const idioma    = item.language || null;

      if (!link) continue;

      ligas[categoria] = (ligas[categoria] || 0) + 1;

      const partes  = titulo.split(/:\s*/);
      const partido = partes.length > 1 ? partes.slice(1).join(": ") : titulo;
      const equipos = partido.split(/\s+vs\.?\s+/i);

      transmisiones.push({
        titulo,
        liga:    partes.length > 1 ? partes[0] : categoria,
        hora,
        fecha,
        estado:  calcEstado(hora, fecha),
        idioma,
        equipo1: equipos[0]?.trim() || partido,
        equipo2: equipos[1]?.trim() || "",
        link
      });
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, "PROXIMO": 1, "FINALIZADO": 2 };
      const diff  = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      return diff !== 0 ? diff : a.hora.localeCompare(b.hora);
    });

    console.log(`✅ gol-2 (la18hd): ${transmisiones.length} eventos obtenidos`);

    const result = {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "la18hd.su",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      transmisiones
    };

    _cache   = result;
    _cacheTs = now;
    return result;

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (la18hd):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "la18hd.su",
      error: `Error obteniendo eventos: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

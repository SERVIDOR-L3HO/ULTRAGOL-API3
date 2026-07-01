const axios = require("axios");

const DIARIES_URL = "https://pltvhd.com/diaries.json";
const IMG_BASE    = "https://cdn.ftvhd.com";
const CACHE_TTL   = 10 * 60 * 1000;

let _cache   = null;
let _cacheTs = 0;

function tryBase64Decode(str) {
  try {
    const decoded = Buffer.from(str, "base64").toString("utf8");
    if (decoded.startsWith("http") || decoded.startsWith("/")) return decoded;
  } catch {}
  return null;
}

function decodeIframePath(iframePath) {
  if (!iframePath) return null;
  let url = iframePath;
  const layer1 = tryBase64Decode(iframePath);
  if (layer1) url = layer1;

  const rMatch = url.match(/[?&]r=([^&]+)/);
  if (rMatch) {
    const layer2 = tryBase64Decode(rMatch[1]);
    if (layer2) url = layer2;
    else url = decodeURIComponent(rMatch[1]);
  }

  return url.startsWith("http") ? url : null;
}

function extractStreamName(iframePath) {
  const url = decodeIframePath(iframePath);
  if (!url) return null;
  const m = url.match(/[?&]stream=([^&]+)/);
  return m ? m[1] : null;
}

function toStatusCode(hora, fecha) {
  try {
    const now = new Date();
    const [h, m] = (hora || "00:00").split(":").map(Number);
    const eventDate = new Date(`${fecha}T${String(h).padStart(2,"0")}:${String(m||0).padStart(2,"0")}:00`);
    const diffMin = (now - eventDate) / 60000;
    if (diffMin > 120) return "FINALIZADO";
    if (diffMin >= -5) return "EN VIVO";
    return "PROXIMO";
  } catch {
    return "PROXIMO";
  }
}

async function scrapTransmisiones2() {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log("gol-2 (pltvhd): usando cache");
    return _cache;
  }

  try {
    console.log("📺 Obteniendo eventos desde pltvhd.com/diaries.json...");

    const res = await axios.get(DIARIES_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://tvtvhd.com/",
        "Accept": "application/json, */*"
      },
      timeout: 15000
    });

    const items = res.data?.data || [];
    const transmisiones = [];
    const ligas = {};

    for (const item of items) {
      const attr     = item.attributes || {};
      const titulo   = (attr.diary_description || "Evento desconocido").replace(/\n/g, " ").trim();
      const hora     = attr.diary_hour ? attr.diary_hour.substring(0, 5) : "00:00";
      const fecha    = attr.date_diary || new Date().toISOString().split("T")[0];
      const liga     = attr.country?.data?.attributes?.name || "Deportes";
      const embeds   = attr.embeds?.data || [];

      const canales = embeds
        .map(e => {
          const ea = e?.attributes || {};
          const canalNombre = (ea.embed_name || "").trim();
          const iframePath  = ea.embed_iframe || "";
          const streamName  = extractStreamName(iframePath);
          if (!streamName) return null;
          return {
            nombre: canalNombre || streamName,
            calidad: "HD",
            link: `https://tvhd2.com/tv/canales.php?stream=${streamName}`
          };
        })
        .filter(Boolean);

      if (canales.length === 0) continue;

      ligas[liga] = (ligas[liga] || 0) + 1;

      const partes  = titulo.split(/:\s*/);
      const partido = partes[1] || titulo;
      const equipos = partido.split(/\s+vs\.?\s+/i);

      transmisiones.push({
        titulo,
        liga: partes[0] || liga,
        hora,
        fecha,
        estado: toStatusCode(hora, fecha),
        equipo1: equipos[0]?.trim() || partido,
        equipo2: equipos[1]?.trim() || "",
        logoUrl: attr.country?.data?.attributes?.image?.data?.attributes?.url
          ? `${IMG_BASE}${attr.country.data.attributes.image.data.attributes.url}`
          : null,
        canales
      });
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, "PROXIMO": 1, "FINALIZADO": 2 };
      const diff = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      return diff !== 0 ? diff : a.hora.localeCompare(b.hora);
    });

    console.log(`✅ gol-2 (pltvhd): ${transmisiones.length} eventos obtenidos`);

    const result = {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "pltvhd.com",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      transmisiones
    };

    _cache   = result;
    _cacheTs = now;
    return result;

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (pltvhd):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "pltvhd.com",
      error: `Error obteniendo eventos: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

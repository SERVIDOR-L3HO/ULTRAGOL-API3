const axios = require("axios");

const m3u8Cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

const KNOWN_CHANNELS = [
  { id: "mespn",           nombre: "ESPN",              deporte: "Deportes" },
  { id: "mespn2",          nombre: "ESPN 2",            deporte: "Deportes" },
  { id: "mespn3",          nombre: "ESPN 3",            deporte: "Deportes" },
  { id: "mespn4",          nombre: "ESPN 4",            deporte: "Deportes" },
  { id: "mespn5",          nombre: "ESPN 5",            deporte: "Deportes" },
  { id: "mespndeportes",   nombre: "ESPN Deportes",     deporte: "Deportes" },
  { id: "mnbatv",          nombre: "NBA TV",            deporte: "Baloncesto" },
  { id: "mmlbtv",          nombre: "MLB TV",            deporte: "Béisbol" },
  { id: "mtnt",            nombre: "TNT",               deporte: "Deportes" },
  { id: "mtbs",            nombre: "TBS",               deporte: "Deportes" },
  { id: "mcbs",            nombre: "CBS",               deporte: "Deportes" },
  { id: "mnfln",           nombre: "NFL Network",       deporte: "Fútbol Americano" },
  { id: "mtudn",           nombre: "TUDN",              deporte: "Fútbol" },
  { id: "mtorontobluejays",nombre: "Blue Jays Live",    deporte: "Béisbol" },
  { id: "mchicagocubs",    nombre: "Chicago Cubs Live",  deporte: "Béisbol" },
  { id: "mbostonredsox",   nombre: "Boston Red Sox Live",deporte: "Béisbol" },
  { id: "mlosangelesdodgers", nombre: "LA Dodgers Live", deporte: "Béisbol" },
  { id: "matlantabraves",  nombre: "Atlanta Braves Live",deporte: "Béisbol" },
  { id: "mdetroittigers",  nombre: "Detroit Tigers Live",deporte: "Béisbol" },
  { id: "mmiamimarlins",   nombre: "Miami Marlins Live", deporte: "Béisbol" },
  { id: "mtexasrangers",   nombre: "Texas Rangers Live", deporte: "Béisbol" },
  { id: "mchicagowhitesox",nombre: "White Sox Live",    deporte: "Béisbol" },
  { id: "msandiegopadres", nombre: "Padres Live",        deporte: "Béisbol" },
];

async function extractM3u8(channelId) {
  const cached = m3u8Cache.get(channelId);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.url;

  try {
    const res = await axios.get(
      `https://exposestrat.com/maestrohd1.php?player=desktop&live=${channelId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://embedhd.org/"
        },
        timeout: 12000
      }
    );
    const html = res.data;

    const m = html.match(/return\s*\(\s*(\[[\s\S]*?\])\.join\s*\(\s*""\s*\)/);
    if (!m) return null;

    let chars;
    try { chars = JSON.parse(m[1]); } catch { return null; }
    if (!Array.isArray(chars)) return null;

    let url = chars.join("");

    const varJoins = [...html.matchAll(/(\w+)\.join\s*\(\s*""\s*\)/g)];
    for (const vj of varJoins) {
      const varName = vj[1];
      const varDef = html.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[^\\]]*\\])`));
      if (varDef) {
        try {
          const extra = JSON.parse(varDef[1]);
          if (Array.isArray(extra)) url += extra.join("");
        } catch {}
      }
    }

    const spanRefs = [...html.matchAll(/getElementById\s*\(\s*["']([^"']+)["']\s*\)\.innerHTML/g)];
    for (const sr of spanRefs) {
      const spanId = sr[1];
      const spanVal = html.match(new RegExp(`id=${spanId}>([^<]*)<`));
      if (spanVal) url += spanVal[1];
    }

    if (url.includes("cdn") && (url.includes(".m3u8") || url.includes("zohanayaan") || url.includes("skylivehd"))) {
      m3u8Cache.set(channelId, { url, ts: Date.now() });
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveWithConcurrency(tasks, limit = 6) {
  const results = new Array(tasks.length).fill(null);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function scrapTransmisiones2() {
  try {
    console.log("📺 Obteniendo canales en vivo de skylivehd.com...");

    const tasks = KNOWN_CHANNELS.map(ch => async () => {
      const m3u8 = await extractM3u8(ch.id);
      if (!m3u8) return null;
      return { ...ch, m3u8 };
    });

    const results = await resolveWithConcurrency(tasks, 6);
    const activeChannels = results.filter(Boolean);

    const transmisiones = activeChannels.map(ch => ({
      titulo: ch.nombre,
      evento: ch.nombre,
      equipo1: ch.nombre,
      equipo2: "",
      liga: ch.deporte,
      deporte: ch.deporte,
      hora: "",
      fecha: new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" }),
      estado: "EN VIVO",
      channelId: ch.id,
      canales: [{
        nombre: ch.nombre,
        calidad: "HD",
        m3u8: ch.m3u8,
        m3u8Direct: ch.m3u8
      }]
    }));

    const ligas = {};
    transmisiones.forEach(t => {
      ligas[t.liga] = (ligas[t.liga] || 0) + 1;
    });

    console.log(`✅ gol-2 (skylivehd): ${transmisiones.length}/${KNOWN_CHANNELS.length} canales activos`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "skylivehd.com",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (skylivehd):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "skylivehd.com",
      error: `Error obteniendo canales: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

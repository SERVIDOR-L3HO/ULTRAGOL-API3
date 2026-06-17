const axios = require("axios");

const AGENDA_URL = "https://la18hd.com/eventos/json/agenda123.json";
const CACHE_TTL = 10 * 60 * 1000;

let _cache = null;
let _cacheTs = 0;

const STREAM_MAP = {
  dsports:              "📺 DSports",
  dsports2:             "📺 DSports 2",
  dsportsplus:          "📺 DSports Plus",
  vtvplus:              "📺 VTV Plus",
  tycsports:            "📺 TyC Sports",
  tycinternacional:     "📺 TyC Internacional",
  foxsports:            "🦊 Fox Sports",
  foxsportsmx:          "🦊 Fox Sports MX",
  foxsports2mx:         "🦊 Fox Sports 2",
  foxsports3mx:         "🦊 Fox Sports 3",
  foxsports1_usa:       "🦊 Fox Sports 1 USA",
  espnmx:               "🏟 ESPN",
  espn2mx:              "🏟 ESPN 2",
  espn3mx:              "🏟 ESPN 3",
  espn4mx:              "🏟 ESPN 4",
  espn5:                "🏟 ESPN 5",
  espn6:                "🏟 ESPN 6",
  espn7:                "🏟 ESPN 7",
  espnpremium:          "🏟 ESPN Premium",
  espndeportes:         "🏟 ESPN Deportes",
  disney1:              "⭐ Star+",
  disney2:              "⭐ Star+ 2",
  disney6:              "⭐ Star+ 6",
  telefe:               "📡 Telefe",
  tvpublica:            "📡 TV Pública",
  canal11:              "📡 Canal 11",
  canal5:               "📡 Canal 5",
  azteca7:              "🦅 Azteca 7",
  aztecadeportes:       "🦅 Azteca Deportes",
  calientetv:           "🔥 Caliente TV",
  tntsports:            "⚡ TNT Sports",
  cbssports:            "📺 CBS Sports",
  beinsports_spanish:   "🟢 BeIN Sports",
  beinsports_xtra_spanish: "🟢 BeIN Sports Xtra",
  golperu:              "⚽ GO Perú",
  movistar:             "📺 Movistar Deportes",
  winsports:            "🏆 Win Sports",
  winsportsplus:        "🏆 Win Sports+",
  winsports2:           "🏆 Win Sports+ 2",
  caracol:              "📡 Caracol TV",
  americatv:            "📺 América TV",
  sportv:               "📺 SporTV",
  caze1:                "📺 CazeTV",
  caze2:                "📺 CazeTV 2",
  dazn1:                "🔴 DAZN 1",
  dazn2:                "🔴 DAZN 2",
  dazn3:                "🔴 DAZN 3",
  dazn4:                "🔴 DAZN 4",
  liga1max:             "🏟 Liga 1 MAX",
  goltv:                "⚽ Deportes TV",
  tudn:                 "📺 TUDN",
  tudnmx:               "📺 TUDN MX",
  vix1:                 "📺 VIX+",
};

const LANG_EMOJI = {
  espa:  "🇪🇸",
  ingl:  "🇺🇸",
  portu: "🇧🇷",
};

function getNombreCanal(link, language) {
  try {
    const stream = new URL(link).searchParams.get("stream");
    if (stream) {
      const base = STREAM_MAP[stream] || `📺 ${stream.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}`;
      const lang = (language || "").toLowerCase();
      const flag = Object.entries(LANG_EMOJI).find(([k]) => lang.includes(k))?.[1] || "";
      return flag ? `${base} ${flag}` : base;
    }
  } catch {}
  const lang = (language || "").toLowerCase();
  const flag = Object.entries(LANG_EMOJI).find(([k]) => lang.includes(k))?.[1] || "";
  return flag ? `📡 Stream ${flag}` : "📡 Stream";
}

function toStatusCode(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("vivo") || s.includes("live")) return "EN VIVO";
  if (s.includes("final")) return "FINALIZADO";
  return "PRÓXIMO";
}

async function scrapTransmisiones2() {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log("📺 gol-2 (la18hd): usando caché");
    return _cache;
  }

  try {
    console.log("📺 Obteniendo eventos de la18hd.com...");

    const res = await axios.get(AGENDA_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://la18hd.com/eventos/",
        "Accept": "application/json, text/plain, */*"
      },
      timeout: 15000
    });

    const items = Array.isArray(res.data) ? res.data : [];

    const grouped = new Map();

    for (const item of items) {
      const titulo = (item.title || "Sin título").trim();
      if (!grouped.has(titulo)) {
        grouped.set(titulo, {
          titulo,
          categoria: item.category || "Fútbol",
          hora: item.time || "",
          fecha: item.date || new Date().toISOString().slice(0, 10),
          estado: toStatusCode(item.status),
          canales: []
        });
      }
      grouped.get(titulo).canales.push({
        nombre: getNombreCanal(item.link || "", item.language || ""),
        calidad: "HD",
        link: item.link || ""
      });
    }

    const transmisiones = [];
    const ligas = {};

    for (const [, ev] of grouped) {
      const deporte = ev.categoria || "Fútbol";
      ligas[deporte] = (ligas[deporte] || 0) + 1;

      const partes = ev.titulo.split(/:\s*/);
      const liga = partes[0] || ev.titulo;
      const partido = partes[1] || ev.titulo;
      const equipos = partido.split(/\s+vs\.?\s+/i);

      transmisiones.push({
        titulo: ev.titulo,
        liga,
        hora: ev.hora,
        fecha: ev.fecha,
        estado: ev.estado,
        equipo1: equipos[0]?.trim() || partido,
        equipo2: equipos[1]?.trim() || "",
        canales: ev.canales
      });
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, "PRÓXIMO": 1, "FINALIZADO": 2 };
      const diff = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      return diff !== 0 ? diff : a.hora.localeCompare(b.hora);
    });

    console.log(`✅ gol-2 (la18hd): ${transmisiones.length} eventos, ${items.length} canales totales`);

    const result = {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "la18hd.com",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      transmisiones
    };

    _cache = result;
    _cacheTs = now;
    return result;

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2 (la18hd):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "la18hd.com",
      error: `Error obteniendo eventos: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

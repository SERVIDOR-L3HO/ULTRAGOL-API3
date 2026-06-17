const axios = require("axios");

const AGENDA_URL = "https://la18hd.com/eventos/json/agenda123.json";
const CACHE_TTL = 10 * 60 * 1000;

let _cache = null;
let _cacheTs = 0;

function getNombreCanal(link, language) {
  try {
    const url = new URL(link);
    const stream = url.searchParams.get("stream");
    if (stream) {
      const map = {
        dsports: "DSports",
        dsports2: "DSports 2",
        dsportsplus: "DSports Plus",
        vtvplus: "VTV Plus",
        tycsports: "TyC Sports",
        tycinternacional: "TyC Internacional",
        foxsports: "Fox Sports",
        foxsportsmx: "Fox Sports MX",
        foxsports2mx: "Fox Sports 2",
        foxsports3mx: "Fox Sports 3",
        foxsports1_usa: "Fox Sports 1 USA",
        espnmx: "ESPN",
        espn2mx: "ESPN 2",
        espn3mx: "ESPN 3",
        espn4mx: "ESPN 4",
        espn5: "ESPN 5",
        espn6: "ESPN 6",
        espn7: "ESPN 7",
        espnpremium: "ESPN Premium",
        espndeportes: "ESPN Deportes",
        disney1: "Star+",
        disney2: "Star+ 2",
        disney6: "Star+ 6",
        telefe: "Telefe",
        tvpublica: "TV Pública",
        canal11: "Canal 11",
        canal5: "Canal 5 MX",
        azteca7: "Azteca 7",
        aztecadeportes: "Azteca Deportes",
        calientetv: "Caliente TV",
        tntsports: "TNT Sports",
        cbssports: "CBS Sports",
        beinsports_spanish: "BeIN Sports Español",
        beinsports_xtra_spanish: "BeIN Sports Xtra",
        golperu: "GO (Perú)",
        movistar: "Movistar Deportes",
        winsports: "Win Sports",
        winsportsplus: "Win Sports Plus",
        winsports2: "Win Sports Plus 2",
        caracol: "Caracol TV",
        americatv: "América TV",
        sportv: "SporTV",
        caze1: "CazeTV",
        caze2: "CazeTV 2",
        dazn1: "DAZN 1",
        dazn2: "DAZN 2",
        dazn3: "DAZN 3",
        dazn4: "DAZN 4",
        liga1max: "Liga 1 MAX",
        goltv: "Deportes TV",
        eventos: "Canal 5 MX (Eventos)",
        tudn: "TUDN",
        tudnmx: "TUDN MX",
        vix1: "VIX+",
      };
      if (map[stream]) return map[stream];
      return stream.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }
  } catch {}

  if (language && language.trim()) {
    return `Stream (${language.trim()})`;
  }
  return "Stream";
}

function getIdioma(language) {
  if (!language) return "";
  const l = language.toLowerCase().trim();
  if (l.includes("ingl")) return "🇺🇸 Inglés";
  if (l.includes("portugu")) return "🇧🇷 Portugués";
  if (l.includes("espa")) return "🇪🇸 Español";
  return language.trim();
}

function toStatusCode(status) {
  if (!status) return "pronto";
  const s = status.toLowerCase();
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
      const key = (item.title || "Sin título").trim();
      if (!grouped.has(key)) {
        grouped.set(key, {
          titulo: key,
          categoria: item.category || "Fútbol",
          hora: item.time || "",
          fecha: item.date || new Date().toISOString().slice(0, 10),
          estado: toStatusCode(item.status),
          canales: []
        });
      }
      const canal = getNombreCanal(item.link || "", item.language || "");
      const idioma = getIdioma(item.language || "");
      grouped.get(key).canales.push({
        nombre: canal + (idioma ? ` — ${idioma}` : ""),
        calidad: "HD",
        m3u8: item.link || "",
        m3u8Direct: item.link || "",
        idioma: idioma,
        link: item.link || ""
      });
    }

    const transmisiones = [];
    const ligas = {};

    for (const [, evento] of grouped) {
      const deporte = evento.categoria || "Fútbol";
      ligas[deporte] = (ligas[deporte] || 0) + 1;

      const partes = evento.titulo.split(/:\s*/);
      const liga = partes[0] || evento.titulo;
      const partido = partes[1] || evento.titulo;
      const equipos = partido.split(/\s+vs\.?\s+/i);
      const equipo1 = equipos[0]?.trim() || partido;
      const equipo2 = equipos[1]?.trim() || "";

      transmisiones.push({
        titulo: evento.titulo,
        evento: evento.titulo,
        equipo1,
        equipo2,
        liga,
        deporte,
        hora: evento.hora,
        fecha: evento.fecha,
        estado: evento.estado,
        channelId: null,
        canales: evento.canales
      });
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, "PRÓXIMO": 1, "FINALIZADO": 2 };
      const diff = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      if (diff !== 0) return diff;
      return a.hora.localeCompare(b.hora);
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

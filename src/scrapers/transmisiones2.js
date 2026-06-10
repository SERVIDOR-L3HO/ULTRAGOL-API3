const axios = require("axios");

const AGENDA_URL = "https://api.goleafutbol.com/api/agenda";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.goleafutbol.com/",
  "Accept": "application/json"
};

const m3u8Cache = new Map();

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

async function resolveM3u8(streamXhdUrl) {
  if (!streamXhdUrl || !streamXhdUrl.includes("stream-xhd.com")) return null;

  const cached = m3u8Cache.get(streamXhdUrl);
  if (cached && (Date.now() - cached.ts) < 30 * 60 * 1000) return cached.url;

  try {
    const r = await axios.get(streamXhdUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Referer": "https://stream-xhd.com/"
      },
      timeout: 10000
    });
    const html = r.data;

    const varNameMatch = html.match(/var playbackURL="",(\w+)=\[\]/);
    if (!varNameMatch) return null;
    const varName = varNameMatch[1];

    const arrStart = html.indexOf(varName + "=[[");
    if (arrStart === -1) return null;

    let depth = 0, i = arrStart + varName.length + 1;
    while (i < html.length) {
      if (html[i] === "[") depth++;
      else if (html[i] === "]") { depth--; if (depth === 0) { i++; break; } }
      i++;
    }
    const arr = JSON.parse(html.slice(arrStart + varName.length + 1, i));

    const kVals = [...html.matchAll(/return\s+(\d{4,})\s*;/g)].map(m => parseInt(m[1]));
    if (kVals.length < 2) return null;
    const k = kVals[0] + kVals[1];

    arr.sort((a, b) => a[0] - b[0]);
    let url = "";
    arr.forEach(e => {
      const decoded = Buffer.from(e[1], "base64").toString("utf8");
      const num = parseInt(decoded.replace(/\D/g, ""));
      url += String.fromCharCode(num - k);
    });

    if (url.includes(".m3u8") || url.includes("://")) {
      m3u8Cache.set(streamXhdUrl, { url, ts: Date.now() });
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveWithConcurrency(tasks, limit = 5) {
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

function extractTeams(title) {
  const clean = title.replace(/^[^:]+:\s*/, "").trim();
  const sep = clean.match(/\s+vs\.?\s+/i);
  if (sep) {
    const idx = clean.search(/\s+vs\.?\s+/i);
    return {
      equipo1: clean.slice(0, idx).trim(),
      equipo2: clean.slice(idx + sep[0].length).trim()
    };
  }
  return { equipo1: clean, equipo2: "" };
}

async function scrapTransmisiones2() {
  try {
    console.log("📺 Obteniendo agenda de partidos desde goleafutbol.com...");

    const response = await axios.get(AGENDA_URL, { headers: HEADERS, timeout: 15000 });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Respuesta inesperada de api.goleafutbol.com/api/agenda");
    }

    const eventos = response.data;

    const allChannelUrls = [];
    eventos.forEach(evento => {
      (evento.channels || []).forEach(c => {
        const streamUrl = decodeStreamUrl(c.url);
        if (streamUrl && !allChannelUrls.includes(streamUrl)) {
          allChannelUrls.push(streamUrl);
        }
      });
    });

    console.log(`🔓 Resolviendo m3u8 de ${allChannelUrls.length} canales únicos...`);
    const m3u8Tasks = allChannelUrls.map(url => () => resolveM3u8(url));
    const m3u8Results = await resolveWithConcurrency(m3u8Tasks, 8);
    const m3u8Map = {};
    allChannelUrls.forEach((url, i) => { if (m3u8Results[i]) m3u8Map[url] = m3u8Results[i]; });

    const ligas = {};
    const transmisiones = [];

    eventos.forEach(evento => {
      const { title, time, category, language, status, date, channels } = evento;
      if (!title) return;

      const { equipo1, equipo2 } = extractTeams(title);
      const liga = category || "Deportes";
      ligas[liga] = (ligas[liga] || 0) + 1;

      const canales = (channels || []).map(c => {
        const streamUrl = decodeStreamUrl(c.url);
        return {
          nombre: c.name,
          calidad: c.quality || "720p",
          url: streamUrl,
          m3u8: m3u8Map[streamUrl] || null,
          channelId: c.channelId
        };
      }).filter(c => c.url);

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

    const resolved = Object.keys(m3u8Map).length;
    console.log(`✅ goleafutbol.com: ${transmisiones.length} partidos, ${resolved}/${allChannelUrls.length} m3u8 resueltos`);

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

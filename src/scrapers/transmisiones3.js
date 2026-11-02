const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE_BASE = "https://streamtp.site";
const AGENDA_URL = `${SOURCE_BASE}/eventos.html`;
const CACHE_TTL = 10 * 60 * 1000;

let _cache = null;
let _cacheTs = 0;

function absoluteUrl(value) {
  if (!value) return null;

  try {
    return new URL(value, SOURCE_BASE).toString();
  } catch {
    return null;
  }
}

function toStatusCode(instant, hora, fecha, duration = 120) {
  try {
    const eventDate = instant
      ? new Date(instant)
      : new Date(`${fecha}T${String(hora || "00:00").padStart(5, "0")}:00`);

    if (Number.isNaN(eventDate.getTime())) return "PROXIMO";

    const diffMin = (Date.now() - eventDate.getTime()) / 60000;
    const durationMin = Number(duration) || 120;
    if (diffMin >= durationMin) return "FINALIZADO";
    if (diffMin >= 0) return "EN VIVO";
    return "PROXIMO";
  } catch {
    return "PROXIMO";
  }
}

function splitTeams(title) {
  const teams = title.split(/\s+vs\.?\s+/i);
  return {
    equipo1: teams[0]?.trim() || title,
    equipo2: teams[1]?.trim() || ""
  };
}

function extractEvents(html) {
  const $ = cheerio.load(html);
  let events = null;
  let parseError = null;

  $("script").each((_, script) => {
    const contents = $(script).html() || "";
    const match = contents.match(/\b(?:var|let|const)\s+EVENTS\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!match) return;

    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        events = parsed;
        return false;
      }
    } catch (error) {
      parseError = error;
    }
  });

  if (!events) {
    throw new Error(parseError
      ? `No se pudo interpretar la agenda de StreamTP: ${parseError.message}`
      : "La página no contiene la agenda JSON de StreamTP");
  }
  return events;
}

function parseEvent(event) {
  const title = String(event.title || event.name || "Evento deportivo").trim();
  const titleParts = title.match(/^([^:]+):\s*(.+)$/);
  const liga = titleParts?.[1]?.trim() || event.competition || event.category || "Deportes";
  const partido = titleParts?.[2]?.trim() || title;
  const fecha = event.date || event.time_utc?.split("T")[0] || new Date().toISOString().split("T")[0];
  const hora = event.time || "00:00";
  const options = event.protected === true || !Array.isArray(event.options) ? [] : event.options;

  const canales = options.map((option, index) => {
    const link = absoluteUrl(option?.url);
    if (!link) return null;

    const label = String(option.label || "").trim();
    let streamName = "";
    try {
      streamName = new URL(link).searchParams.get("stream") || "";
    } catch {}

    return {
      nombre: label || streamName.replace(/[_-]+/g, " ").toUpperCase() ||
        (index === 0 ? "Stream Principal" : `Canal ${index + 1}`),
      fuente: option.source || null,
      sourceId: option.id || null,
      link
    };
  }).filter(Boolean);

  return {
    titulo: title,
    liga,
    deporte: event.category || "Fútbol",
    hora,
    fecha,
    estado: toStatusCode(event.time_utc, hora, fecha, event.duration),
    ...splitTeams(partido),
    canales
  };
}

function mergeDuplicateEvents(events) {
  const grouped = new Map();
  const statusRank = { "EN VIVO": 3, PROXIMO: 2, FINALIZADO: 1 };

  for (const event of events) {
    const key = `${event.fecha}|${event.titulo.toLowerCase()}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...event, canales: [...event.canales] });
      continue;
    }

    const knownLinks = new Set(existing.canales.map(channel => channel.link));
    for (const channel of event.canales) {
      if (!knownLinks.has(channel.link)) {
        existing.canales.push(channel);
        knownLinks.add(channel.link);
      }
    }

    if ((statusRank[event.estado] || 0) > (statusRank[existing.estado] || 0)) {
      existing.estado = event.estado;
    }
  }

  return Array.from(grouped.values());
}

async function scrapTransmisiones3() {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log("gol-3 (streamtp.site): usando cache");
    return _cache;
  }

  try {
    console.log(`📺 Obteniendo agenda desde ${AGENDA_URL}...`);

    const response = await axios.get(AGENDA_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      timeout: 15000
    });

    const transmisiones = mergeDuplicateEvents(extractEvents(response.data)
      .map(parseEvent)
      .filter(event => event.canales.length > 0));

    const ligas = {};
    for (const transmision of transmisiones) {
      ligas[transmision.liga] = (ligas[transmision.liga] || 0) + 1;
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, PROXIMO: 1, FINALIZADO: 2 };
      const diff = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      if (diff !== 0) return diff;
      const dateDiff = a.fecha.localeCompare(b.fecha);
      return dateDiff !== 0 ? dateDiff : a.hora.localeCompare(b.hora);
    });

    console.log(`✅ gol-3 (streamtp.site): ${transmisiones.length} eventos obtenidos`);

    const result = {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "streamtp.site",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      elapsedTime: `${Date.now() - now}ms`,
      transmisiones
    };

    _cache = result;
    _cacheTs = now;
    return result;
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones3 (streamtp.site):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "streamtp.site",
      error: `Error obteniendo eventos: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones3 };
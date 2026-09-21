const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE_BASE = "https://futbollibretvs.co";
const AGENDA_URL = `${SOURCE_BASE}/agenda`;
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

function toStatusCode(instant, hora, fecha) {
  try {
    const eventDate = instant
      ? new Date(instant)
      : new Date(`${fecha}T${String(hora || "00:00").padStart(5, "0")}:00`);

    if (Number.isNaN(eventDate.getTime())) return "PROXIMO";

    const diffMin = (Date.now() - eventDate.getTime()) / 60000;
    if (diffMin > 150) return "FINALIZADO";
    if (diffMin >= -5) return "EN VIVO";
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

function parseEvent($, element) {
  const event = $(element);
  const instant = event.attr("data-source-instant") || null;
  const rawTitle = event.find(".source-agenda-eventtext strong").first().text().trim();
  const competition = event.find(".source-agenda-competition").first().text().trim().replace(/:\s*$/, "");
  const title = rawTitle || "Evento desconocido";
  const partido = competition
    ? title.replace(new RegExp(`^${competition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:?\\s*`, "i"), "")
    : title;

  const sourceLinks = event.find(".agenda-source-button").map((_, sourceElement) => {
    const source = $(sourceElement);
    const href = source.attr("href");
    const link = absoluteUrl(href);
    if (!link) return null;

    const sourceId = href?.match(/[#&?]source=(\d+)/i)?.[1] || null;
    const provider = source.find("small").first().text().trim();
    const label = source.find("span").first().text().trim();

    return {
      nombre: provider || label || "Fuente",
      fuente: label || null,
      sourceId,
      link
    };
  }).get().filter(Boolean);

  const matchLink = absoluteUrl(event.find(".agenda-open-match").first().attr("href"));
  const logoUrl = absoluteUrl(event.find(".source-agenda-flag").first().attr("src"));
  const [fecha = new Date().toISOString().split("T")[0]] = (instant || "").split("T");
  const hora = event.find("[data-agenda-time]").first().text().trim() || "00:00";

  return {
    titulo: title,
    liga: competition || "Deportes",
    hora,
    fecha,
    estado: toStatusCode(instant, hora, fecha),
    ...splitTeams(partido),
    logoUrl,
    matchLink,
    canales: sourceLinks
  };
}

async function scrapTransmisiones3() {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log("gol-3 (futbollibretvs): usando cache");
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

    const $ = cheerio.load(response.data);
    const transmisiones = $("[data-agenda-event]")
      .map((_, element) => parseEvent($, element))
      .get()
      .filter(event => event.canales.length > 0);

    const ligas = {};
    for (const transmision of transmisiones) {
      ligas[transmision.liga] = (ligas[transmision.liga] || 0) + 1;
    }

    transmisiones.sort((a, b) => {
      const order = { "EN VIVO": 0, PROXIMO: 1, FINALIZADO: 2 };
      const diff = (order[a.estado] ?? 1) - (order[b.estado] ?? 1);
      return diff !== 0 ? diff : a.hora.localeCompare(b.hora);
    });

    console.log(`✅ gol-3 (futbollibretvs): ${transmisiones.length} eventos obtenidos`);

    const result = {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "futbollibretvs.co",
      ligas,
      ligasDisponibles: Object.keys(ligas),
      transmisiones
    };

    _cache = result;
    _cacheTs = now;
    return result;
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones3 (futbollibretvs):", error.message);
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "futbollibretvs.co",
      error: `Error obteniendo eventos: ${error.message}`,
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones3 };
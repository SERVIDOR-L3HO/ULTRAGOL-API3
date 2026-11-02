const axios = require("axios");

const AGENDA_URL = "https://streamxhd.sbs/eventos.json";

const SPORT_KEYWORDS = {
  "Béisbol":         ["Red Sox", "Yankees", "Dodgers", "Cubs", "Mets", "Braves", "Cardinals", "Phillies", "Astros", "Brewers", "Mariners", "Twins", "Reds", "Nationals", "Rays", "Angels", "Royals", "Rangers", "Tigers", "Marlins", "Orioles", "Guardians", "Giants", "Padres", "Diamondbacks", "Pirates", "Blue Jays", "White Sox", "Athletics", "Rockies"],
  "Baloncesto":      ["Lakers", "Celtics", "Heat", "Bucks", "Warriors", "Nets", "Suns", "Knicks", "Bulls", "Spurs", "Nuggets", "Clippers", "NBA", "Sparks", "Aces", "Liberty", "Mystics", "Sky", "Valkyries", "Storm", "Fire", "Tempo", "WNBA"],
  "Hockey":          ["Hurricanes", "Golden Knights", "Bruins", "Maple Leafs", "Canadiens", "NHL"],
  "Automovilismo":   ["Formula 1", "F1", "NASCAR", "Grand Prix", "Monaco", "IndyCar", "Series at", "Truck Series", "Cup Series"],
  "Boxeo":           ["BKFC", "WBC", "WBA", "IBF", "WBO", "Boxing", "Fight Night"],
  "MMA":             ["UFC", "Bellator", " MMA"],
  "Tenis":           ["Open", "Wimbledon", "Roland Garros", "Australian Open"],
  "Fútbol":          ["FC ", " FC", "United", "Real ", "Atlético", "Sporting", "Copa", "UEFA", "FIFA", "League", "Bundesliga", "Ligue", "Serie A", "LaLiga", "Premier",
                      "Spain", "Italy", "France", "Germany", "Brazil", "Brasil", "México", "Mexico", "Argentina", "Portugal",
                      "England", "Netherlands", "Belgium", "Croatia", "Serbia", "Ukraine", "Poland", "Sweden", "Norway",
                      "Denmark", "Finland", "Switzerland", "Austria", "Hungary", "Slovakia", "Czech", "Czechia", "Romania",
                      "Scotland", "Ireland", "Turkey", "Greece", "Algeria", "Morocco", "Senegal", "Nigeria", "Ghana",
                      "Cameroon", "DR Congo", "Guinea", "Iraq", "Saudi", "Japan", "Korea", "USA", "Canada", "Colombia",
                      "Chile", "Peru", "Uruguay", "Ecuador", "Venezuela", "Costa Rica", "Panama", "Guatemala",
                      "Honduras", "Jamaica", "Cuba", "Luxembourg", "Latvia", "Estonia", "Lithuania", "Georgia",
                      "Armenia", "Azerbaijan", "Kazakhstan", "Northern Ireland", "Wales", "Albania", "Bosnia",
                      "Montenegro", "Kosovo", "North Macedonia", "Slovenia", "Bulgaria", "Congo"],
};

const COUNTRIES = new Set(["Spain","Italy","France","Germany","Brazil","Brasil","México","Mexico","Argentina",
  "Portugal","England","Netherlands","Belgium","Croatia","Serbia","Ukraine","Poland","Sweden","Norway",
  "Denmark","Finland","Switzerland","Austria","Hungary","Slovakia","Czech","Czechia","Romania","Scotland",
  "Ireland","Turkey","Greece","Algeria","Morocco","Senegal","Nigeria","Ghana","Cameroon","DR Congo","Guinea",
  "Iraq","Saudi Arabia","Japan","South Korea","USA","Canada","Colombia","Chile","Peru","Uruguay","Ecuador",
  "Venezuela","Costa Rica","Panama","Guatemala","Honduras","Jamaica","Cuba","Luxembourg","Latvia","Estonia",
  "Lithuania","Georgia","Armenia","Azerbaijan","Kazakhstan","Northern Ireland","Wales","Albania","Bosnia",
  "Montenegro","Kosovo","North Macedonia","Slovenia","Bulgaria","Congo","Sudan","Mali","Ivory Coast",
  "Burkina Faso","Benin","Togo","Zimbabwe","Zambia","Tanzania","Uganda","Rwanda","Libya","Tunisia","Egypt"]);

function detectSport(eventName) {
  const name = eventName.toLowerCase();

  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some(k => name.includes(k.toLowerCase()))) return sport;
  }

  // Si es "X vs Y" con ambos siendo países → Fútbol
  const vsMatch = eventName.match(/^(.+?)\s+vs\s+(.+)$/i);
  if (vsMatch) {
    const a = vsMatch[1].trim();
    const b = vsMatch[2].trim();
    for (const country of COUNTRIES) {
      if (a.includes(country) || b.includes(country)) return "Fútbol";
    }
  }

  return "Deportes";
}

function extractTeams(eventName) {
  const vsMatch = eventName.match(/^(.+?)\s+vs\s+(.+)$/i);
  if (vsMatch) return { equipo1: vsMatch[1].trim(), equipo2: vsMatch[2].trim() };
  return { equipo1: eventName, equipo2: "" };
}

function normalizeSport(sportName, eventName) {
  const sport = String(sportName || "").trim().toLowerCase();
  const translations = {
    "football": "Fútbol",
    "soccer": "Fútbol",
    "basketball": "Baloncesto",
    "motor": "Automovilismo",
    "tennis": "Tenis",
    "american football": "Fútbol americano",
    "hockey": "Hockey",
    "baseball": "Béisbol",
    "boxing": "Boxeo",
    "mma": "MMA"
  };

  return translations[sport] || detectSport(eventName || sportName || "");
}

function parseEventDate(event) {
  const value = event.time || event.datetime || event.date;
  if (!value) return null;

  const text = String(value).trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const direct = new Date(text);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }

  const match = text.replace("T", " ").match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!match) {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  const localTimestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  const timeZone = event.timezone || event.tz || "America/Lima";
  let timestamp = localTimestamp;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(timestamp))
          .filter(part => part.type !== "literal")
          .map(part => [part.type, Number(part.value)])
      );
      const representedTimestamp = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      );
      const nextTimestamp = localTimestamp - (representedTimestamp - timestamp);
      if (nextTimestamp === timestamp) break;
      timestamp = nextTimestamp;
    }
  } catch {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const result = new Date(timestamp);
  return Number.isNaN(result.getTime()) ? null : result;
}

function getEventStatus(event) {
  const suppliedStatus = String(event.status || "").trim().toLowerCase();
  if (["live", "en vivo", "in_progress", "in progress"].includes(suppliedStatus)) {
    return "EN VIVO";
  }
  if (["finished", "finalizado", "complete", "completed"].includes(suppliedStatus)) {
    return "FINALIZADO";
  }
  if (["upcoming", "pronto", "scheduled"].includes(suppliedStatus)) {
    return "PROXIMO";
  }

  const start = parseEventDate(event);
  if (!start) return "PROXIMO";

  const duration = Number(event.duration || 150) + Number(event.extraTime || 0);
  const end = new Date(start.getTime() + duration * 60_000);
  const now = Date.now();

  if (now < start.getTime()) return "PROXIMO";
  if (now <= end.getTime()) return "EN VIVO";
  return "FINALIZADO";
}

function getChannelLanguage(server) {
  const languages = Array.isArray(server.languages)
    ? server.languages
        .map(language => typeof language === "string" ? language : language?.name || language?.code)
        .filter(Boolean)
    : [];

  return languages[0] || server.customLanguages || "es";
}

async function scrapTransmisiones() {
  console.log(`📺 Obteniendo transmisiones desde ${AGENDA_URL}...`);
  const startTime = Date.now();

  try {
    const response = await axios.get(AGENDA_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://streamxhd.sbs/",
        "Accept": "application/json, */*"
      },
      timeout: 15_000
    });

    if (!Array.isArray(response.data?.sports)) {
      throw new Error("La fuente no devolvió una agenda válida");
    }

    const transmisiones = [];
    for (const sport of response.data.sports) {
      for (const league of Array.isArray(sport.leagues) ? sport.leagues : []) {
        for (const event of Array.isArray(league.events) ? league.events : []) {
          const servidores = Array.isArray(event.servers)
            ? event.servers.filter(server => server && server.active !== false && server.url)
            : [];
          if (servidores.length === 0) continue;

          const eventName = String(
            event.title ||
            event.name ||
            [event.homeTeam, event.awayTeam].filter(Boolean).join(" vs ") ||
            "Evento deportivo"
          ).trim();
          const teams = extractTeams(eventName);
          const deporte = normalizeSport(sport.name, eventName);
          const eventLeague = event.league || event.competition || event.tournament || league.name || deporte;

          transmisiones.push({
            evento: eventName,
            liga: eventLeague,
            deporte,
            equipo1: event.homeTeam || teams.equipo1,
            equipo2: event.awayTeam || teams.equipo2,
            estado: getEventStatus(event),
            embedId: event.id ?? event.eventId ?? event.event_id ?? null,
            canales: servidores.map((server, index) => ({
              nombre: server.name || (index === 0 ? "Stream Principal" : `Canal ${index + 1}`),
              idioma: getChannelLanguage(server),
              calidad: server.quality || "720p",
              url: new URL(server.url, "https://streamxhd.sbs/").toString()
            }))
          });
        }
      }
    }

    const deportes = {};
    transmisiones.forEach(t => {
      deportes[t.deporte] = (deportes[t.deporte] || 0) + 1;
    });

    const elapsedTime = Date.now() - startTime;
    const enVivo = transmisiones.filter(transmision => transmision.estado === "EN VIVO").length;
    console.log(`✅ streamxhd.sbs: ${transmisiones.length} eventos en ${elapsedTime}ms`);

    return {
      total: transmisiones.length,
      enVivo,
      actualizado: new Date().toISOString(),
      fuente: "streamxhd.sbs",
      deportes,
      deportesDisponibles: Object.keys(deportes),
      elapsedTime: `${elapsedTime}ms`,
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones };

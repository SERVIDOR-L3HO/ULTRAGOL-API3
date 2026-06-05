const axios = require("axios");

const EMBED_BASE = "https://gooz.aapmains.net/new-stream-embed";
const STREAM_BASE = "https://chatgpt.hereisman.net/playlist";

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

let cachedAnchorId = null;

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

async function checkId(id) {
  try {
    const r = await axios.get(`${EMBED_BASE}/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://gooz.aapmains.net/"
      },
      timeout: 8000
    });

    const html = r.data;
    const hasStream = html.includes("load-playlist") || html.includes("m3u8");
    if (!hasStream) return null;

    const titleMatch = html.match(/title:\s*['"]([^'"]+)['"]/);
    if (!titleMatch) return null;

    const eventName = titleMatch[1].trim();
    if (!eventName || eventName.length < 3) return null;

    return {
      id,
      evento: eventName,
      streamUrl: `${STREAM_BASE}/${id}/load-playlist`,
      embedUrl: `${EMBED_BASE}/${id}`
    };
  } catch {
    return null;
  }
}

async function findAnchorId() {
  if (cachedAnchorId) {
    const result = await checkId(cachedAnchorId);
    if (result) return cachedAnchorId;
    const nearby = await checkId(cachedAnchorId + 100);
    if (nearby) { cachedAnchorId = cachedAnchorId + 100; return cachedAnchorId; }
  }

  const probes = [80000, 70000, 60000, 55000, 52000, 51000, 50000, 45000, 40000, 30000];
  for (const probe of probes) {
    const batch = await Promise.all([
      checkId(probe), checkId(probe - 500), checkId(probe + 500)
    ]);
    const found = batch.find(b => b !== null);
    if (found) {
      cachedAnchorId = found.id;
      return found.id;
    }
  }
  return 51576;
}

async function scanRange(anchorId, rangeSize = 300) {
  const start = Math.max(1, anchorId - rangeSize);
  const end = anchorId + 50;
  const ids = [];
  for (let i = start; i <= end; i++) ids.push(i);

  const BATCH = 20;
  const results = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(id => checkId(id)));
    batchResults.forEach(r => { if (r) results.push(r); });
  }
  return results;
}

async function scrapTransmisiones() {
  console.log("📺 Obteniendo transmisiones desde gooz.aapmains.net...");
  const startTime = Date.now();

  try {
    const anchorId = await findAnchorId();
    console.log(`🎯 Anchor ID encontrado: ${anchorId}`);

    const rawEvents = await scanRange(anchorId, 300);

    if (rawEvents.length > 0) {
      cachedAnchorId = Math.max(...rawEvents.map(e => e.id));
    }

    const seen = new Set();
    const transmisiones = [];

    for (const ev of rawEvents) {
      if (seen.has(ev.evento)) continue;
      seen.add(ev.evento);

      const deporte = detectSport(ev.evento);
      const { equipo1, equipo2 } = extractTeams(ev.evento);

      transmisiones.push({
        evento: ev.evento,
        liga: deporte,
        deporte,
        equipo1,
        equipo2,
        estado: "EN VIVO",
        embedId: ev.id,
        canales: [{
          nombre: "Stream Principal",
          idioma: "es",
          calidad: "720p",
          embed: ev.embedUrl
        }]
      });
    }

    const deportes = {};
    transmisiones.forEach(t => {
      deportes[t.deporte] = (deportes[t.deporte] || 0) + 1;
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ gooz.aapmains.net: ${transmisiones.length} eventos en vivo en ${elapsedTime}ms`);

    return {
      total: transmisiones.length,
      enVivo: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "gooz.aapmains.net",
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

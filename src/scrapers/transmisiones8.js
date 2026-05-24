const axios = require("axios");

const GOLXU_BASE = "https://golxu.com";
const AGENDA_URL = `${GOLXU_BASE}/agenda.json`;
const STREAMED_SPORTS_URL = "https://streamed.pk/api/sports";
const STREAMED_MATCHES_URL = "https://streamed.pk/api/matches";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html, */*",
  "Referer": `${GOLXU_BASE}/`
};

const categoriaMap = {
  football: "Fútbol",
  basketball: "Baloncesto",
  "american-football": "Fútbol Americano",
  hockey: "Hockey",
  baseball: "Béisbol",
  tennis: "Tenis",
  motorsport: "Automovilismo",
  boxing: "Boxeo",
  mma: "MMA",
  rugby: "Rugby",
  golf: "Golf",
  cricket: "Cricket",
  volleyball: "Voleibol"
};

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${GOLXU_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function buildStreamedEmbedUrl(source, id) {
  return `https://embedsports.top/embed/${source}/${id}/1`;
}

async function fetchAgenda() {
  try {
    const res = await axios.get(AGENDA_URL, { headers: HEADERS, timeout: 15000 });
    const eventos = res.data?.eventos || [];

    return eventos.map(ev => {
      const opciones = (ev.opciones || []).map(op => ({
        nombre: op.nombre || "Ver",
        url: resolveUrl(op.url),
        calidad: op.calidad || null
      })).filter(op => op.url);

      return {
        titulo: `${ev.homeTeam || ""} vs ${ev.awayTeam || ""}`.trim(),
        competicion: ev.competicion || ev.categoria || "General",
        categoria: ev.categoria || "General",
        hora: ev.hora || "00:00",
        destacado: !!ev.destacado,
        estado: ev.estado === "on" ? "En vivo" : "Programado",
        equipo1: ev.homeTeam || "",
        equipo2: ev.awayTeam || "",
        logo1: resolveUrl(ev.homeLogo) || null,
        logo2: resolveUrl(ev.awayLogo) || null,
        opciones,
        fuente: "golxu.com/agenda"
      };
    }).filter(ev => ev.opciones.length > 0);
  } catch (err) {
    console.error("❌ Error obteniendo agenda.json de golxu.com:", err.message);
    return [];
  }
}

async function fetchStreamedMatches() {
  try {
    const sportsRes = await axios.get(STREAMED_SPORTS_URL, { headers: HEADERS, timeout: 15000 });
    const sports = sportsRes.data || [];

    const now = Date.now();

    const matchRequests = sports.map(sport =>
      axios.get(`${STREAMED_MATCHES_URL}/${sport.id}`, { headers: HEADERS, timeout: 15000 })
        .then(r => ({ sport, matches: r.data || [] }))
        .catch(() => ({ sport, matches: [] }))
    );

    const results = await Promise.all(matchRequests);

    const transmisiones = [];

    for (const { sport, matches } of results) {
      for (const match of matches) {
        if (!match.date) continue;

        const fecha = new Date(match.date);
        const diffMins = (fecha.getTime() - now) / (1000 * 60);

        let estado = "Programado";
        if (diffMins <= 0 && diffMins > -180) estado = "En vivo";
        else if (diffMins > 0 && diffMins <= 30) estado = "Por comenzar";
        else if (diffMins <= -180) continue;

        const deporte = categoriaMap[sport.id] || sport.name || "Deportes";

        const horaLocal = fecha.toLocaleTimeString("es-MX", {
          timeZone: "America/Mexico_City",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });

        const poster = match.poster
          ? (match.poster.startsWith("http") ? match.poster : `https://streamed.pk${match.poster}`)
          : null;

        const opciones = (match.sources || []).map(s => ({
          nombre: s.source,
          url: buildStreamedEmbedUrl(s.source, s.id),
          calidad: null
        }));

        if (opciones.length === 0) continue;

        transmisiones.push({
          titulo: match.title || "",
          competicion: deporte,
          categoria: sport.id,
          hora: horaLocal,
          destacado: match.popular || false,
          estado,
          equipo1: match.teams?.home?.name || "",
          equipo2: match.teams?.away?.name || "",
          logo1: poster,
          logo2: null,
          opciones,
          fuente: "streamed.pk"
        });
      }
    }

    return transmisiones;
  } catch (err) {
    console.error("❌ Error obteniendo matches de streamed.pk (golxu):", err.message);
    return [];
  }
}

async function scrapTransmisiones8() {
  console.log("📺 Obteniendo transmisiones desde golxu.com...");
  const startTime = Date.now();

  const [agenda, streamed] = await Promise.all([
    fetchAgenda(),
    fetchStreamedMatches()
  ]);

  const transmisiones = [...agenda, ...streamed];

  transmisiones.sort((a, b) => {
    if (a.estado === "En vivo" && b.estado !== "En vivo") return -1;
    if (a.estado !== "En vivo" && b.estado === "En vivo") return 1;
    if (a.destacado && !b.destacado) return -1;
    if (!a.destacado && b.destacado) return 1;
    return (a.hora || "").localeCompare(b.hora || "");
  });

  const deportes = {};
  transmisiones.forEach(t => {
    const cat = t.competicion || "General";
    deportes[cat] = (deportes[cat] || 0) + 1;
  });

  const enVivo = transmisiones.filter(t => t.estado === "En vivo").length;
  const elapsed = Date.now() - startTime;

  console.log(`📺 Golxu.com: ${transmisiones.length} eventos (${enVivo} en vivo) en ${elapsed}ms`);

  return {
    total: transmisiones.length,
    enVivo,
    actualizado: new Date().toISOString(),
    fuente: "golxu.com",
    deportes,
    deportesDisponibles: Object.keys(deportes),
    elapsedTime: `${elapsed}ms`,
    transmisiones
  };
}

module.exports = { scrapTransmisiones8 };

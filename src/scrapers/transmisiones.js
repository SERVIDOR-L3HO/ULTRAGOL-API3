const { exec } = require("child_process");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const API_BASE = "https://apisplus.live";
const SITE_BASE = "https://es12.sportplus.live";

const SPORT_MAP = {
  1: "Fútbol",
  2: "Hockey",
  3: "Baloncesto",
  4: "Tenis",
  5: "Béisbol",
  6: "Volleyball",
  7: "Fútbol Americano",
  8: "Boxeo",
  9: "MMA",
  10: "Rugby",
  11: "Golf",
  12: "Ciclismo",
  13: "Atletismo",
  14: "Automovilismo"
};

function curlGet(url) {
  return new Promise((resolve, reject) => {
    const cmd = [
      "curl -sL --max-time 12",
      `-H "Accept: application/json"`,
      `-H "Origin: ${SITE_BASE}"`,
      `-H "Referer: ${SITE_BASE}/"`,
      `-A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"`,
      `"${url}"`
    ].join(" ");

    exec(cmd, { timeout: 15000 }, (err, stdout) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error("Respuesta no es JSON válido"));
      }
    });
  });
}

async function fetchMatches(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/v3.1/matches/index${query ? "?" + query : ""}`;
  const data = await curlGet(url);
  const resolve = data?.resolve || {};
  return [...(resolve.pageCollection || []), ...(resolve.pageOthers || [])];
}

function buildMatchUrl(uri) {
  if (!uri) return null;
  const esUri = uri.replace(/^\/ru\//, "/es/");
  return SITE_BASE + esUri;
}

function formatScore(match) {
  const scores = match.score || [];
  const total = scores.find(s => s.p === 0);
  if (!total) return null;
  const homeId = match.home?.pk_id;
  const awayId = match.away?.pk_id;
  if (!homeId || !awayId) return null;
  return `${total[homeId] ?? 0}-${total[awayId] ?? 0}`;
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleTimeString("es-MX", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City"
    });
  } catch {
    return "";
  }
}

async function scrapTransmisiones() {
  try {
    console.log("📺 Obteniendo transmisiones desde sportplus.live...");

    const today = new Date().toISOString().slice(0, 10);

    const [liveMatches, todayMatches] = await Promise.all([
      fetchMatches({ live: 1 }).catch(() => []),
      fetchMatches({ date: today }).catch(() => [])
    ]);

    const seenIds = new Set();
    const allMatches = [...liveMatches, ...todayMatches].filter(m => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

    const transmisiones = allMatches.map(match => {
      const deporte = SPORT_MAP[match.sport_id] || match.sport?.name || "Otros";
      const liga = match.tournament?.name || "";
      const equipo1 = match.home?.name || "";
      const equipo2 = match.away?.name || "";
      const enlace = buildMatchUrl(match.uri);
      const estaEnVivo = match.status === "live";
      const marcador = estaEnVivo ? formatScore(match) : null;
      const hora = formatTime(match.start);
      const equiposLogos = extraerEquiposYLogos(`${equipo1} vs ${equipo2}`);

      return {
        fecha: match.start ? match.start.slice(0, 10) : "",
        hora,
        fechaHora: match.start || "",
        evento: match.name || `${equipo1} vs ${equipo2}`,
        liga,
        deporte,
        equipo1,
        equipo2,
        logo1: equiposLogos.logo1,
        logo2: equiposLogos.logo2,
        estado: estaEnVivo ? "EN VIVO" : "PRÓXIMO",
        marcador,
        importante: estaEnVivo,
        canales: enlace ? [{
          nombre: "Ver en SportPlus",
          idioma: "es",
          links: {
            principal: enlace,
            backup: null,
            wrapper: enlace
          }
        }] : [],
        totalCanales: enlace ? 1 : 0,
        enlaceDirecto: enlace
      };
    });

    transmisiones.sort((a, b) => {
      if (a.importante && !b.importante) return -1;
      if (!a.importante && b.importante) return 1;
      return new Date(a.fechaHora) - new Date(b.fechaHora);
    });

    const deportes = {};
    transmisiones.forEach(t => {
      deportes[t.deporte] = (deportes[t.deporte] || 0) + 1;
    });

    const enVivo = transmisiones.filter(t => t.estado === "EN VIVO").length;
    console.log(`✅ sportplus.live: ${transmisiones.length} eventos (${enVivo} en vivo)`);

    return {
      total: transmisiones.length,
      enVivo,
      actualizado: new Date().toISOString(),
      fuente: "es12.sportplus.live",
      deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones };

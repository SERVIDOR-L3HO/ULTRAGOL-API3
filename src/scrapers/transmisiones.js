const { execFile } = require("child_process");
const { promisify } = require("util");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const execFileAsync = promisify(execFile);

const API_URL = "https://rokczone.com/get_agenda.php";
const GLZ_PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";

async function fetchConCurl(url, timeoutMs = 20000) {
  const timeoutSec = Math.floor(timeoutMs / 1000);
  const { stdout } = await execFileAsync("curl", [
    "-s",
    "--max-time", String(timeoutSec),
    "-H", "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "-H", "Accept: application/json, */*",
    "-H", "Accept-Language: es-MX,es;q=0.9,en;q=0.8",
    "-H", "Referer: https://rokczone.com/",
    url
  ], { timeout: timeoutMs + 2000 });
  return JSON.parse(stdout);
}

async function scrapTransmisiones() {
  try {
    console.log("📺 Obteniendo transmisiones desde rokczone.com...");

    const data = await fetchConCurl(API_URL, 20000);
    const matches = data.matches || [];

    const transmisiones = matches.map(match => {
      const canales = (match.channels || []).map(canal => ({
        numero: canal.number,
        nombre: canal.name,
        idioma: canal.language || "",
        links: {
          principal: canal.links && canal.links[0] ? GLZ_PROXY + canal.links[0] : null,
          backup: canal.oldLinks && canal.oldLinks[0] ? GLZ_PROXY + canal.oldLinks[0] : null,
          wrapper: `https://rokczone.com/dabac/porid.php?id=${canal.number}`
        }
      }));

      const equiposLogos = extraerEquiposYLogos(match.matchstr || "");

      return {
        fecha: match.matchDate || "",
        hora: match.time || "",
        fechaHora: `${match.matchDate || ""} ${match.time || ""}`,
        evento: match.matchstr || match.matchText || "",
        liga: match.league || "",
        deporte: match.sport || "",
        equipo1: match.team1 || equiposLogos.equipo1,
        equipo2: match.team2 || equiposLogos.equipo2,
        logo1: equiposLogos.logo1,
        logo2: equiposLogos.logo2,
        importante: match.important || false,
        slug: match.slug || "",
        canales: canales,
        totalCanales: canales.length
      };
    });

    const deportes = {};
    transmisiones.forEach(t => {
      const dep = t.deporte || "Otros";
      deportes[dep] = (deportes[dep] || 0) + 1;
    });

    console.log(`✅ rokczone.com: ${transmisiones.length} partidos obtenidos`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "rokczone.com",
      deportes: deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones: transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones };

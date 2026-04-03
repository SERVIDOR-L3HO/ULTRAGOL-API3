const axios = require("axios");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const API_URL = "https://rokczone.com/get_agenda.php";
const GLZ_PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";

async function scrapTransmisiones() {
  try {
    console.log("📺 Obteniendo transmisiones desde rokczone.com...");

    const response = await axios.get(API_URL, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, */*",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
      }
    });

    const matches = response.data.matches || [];

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

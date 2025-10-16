const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");

function calcularContador(fechaPartido) {
  const ahora = new Date();
  const partido = new Date(fechaPartido);
  const diferencia = partido - ahora;

  if (diferencia < 0) {
    return {
      dias: 0,
      horas: 0,
      minutos: 0,
      segundos: 0,
      mensaje: "Spiel läuft oder beendet"
    };
  }

  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

  return {
    dias,
    horas,
    minutos,
    segundos,
    mensaje: `${dias}T ${horas}h ${minutos}m ${segundos}s`
  };
}

async function scrapPartidosBundesliga() {
  try {
    const url = "https://www.espn.com/soccer/schedule/_/league/ger.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const partidos = [];
    
    $(".ScheduleTables .Table").each((index, table) => {
      const fecha = $(table).prev(".Table__Title").text().trim();
      
      $(table).find("tbody tr").each((i, row) => {
        const equipoLocal = $(row).find("td").eq(0).find(".Table__Team a").last().text().trim();
        const equipoVisitante = $(row).find("td").eq(1).find(".Table__Team a").last().text().trim();
        const horaTexto = $(row).find("td").eq(2).text().trim();
        
        if (equipoLocal && equipoVisitante && horaTexto) {
          const fechaCompleta = `${fecha} ${horaTexto}`;
          const fechaPartido = new Date(fechaCompleta);
          const contador = calcularContador(fechaPartido);
          
          partidos.push({
            equipoLocal,
            equipoVisitante,
            fecha: fecha,
            hora: horaTexto,
            fechaCompleta: fechaPartido.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
            contador: contador
          });
        }
      });
    });

    return {
      actualizado: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      total: partidos.length,
      partidos: partidos.slice(0, 10)
    };
  } catch (error) {
    console.error("Error scraping Bundesliga fixtures:", error.message);
    throw error;
  }
}

module.exports = { scrapPartidosBundesliga };

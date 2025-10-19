const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../../utils/scraper");

async function scrapTablaBundesligaESPN() {
  const url = "https://www.espn.com/soccer/standings/_/league/ger.1";
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);
  
  const equipos = [];
  const nombresEquipos = [];
  
  $("table").first().find("tbody tr").each((i, row) => {
    const primeraColumna = $(row).find("td").first();
    const equipo = primeraColumna.find("a").last().text().trim();
    if (equipo) {
      nombresEquipos.push(equipo);
    }
  });
  
  $("table").eq(1).find("tbody tr").each((i, row) => {
    const cells = $(row).find("td");
    
    if (cells.length >= 8 && nombresEquipos[i]) {
      equipos.push({
        posicion: i + 1,
        equipo: nombresEquipos[i],
        estadisticas: {
          pj: parseInt($(cells[0]).text().trim()) || 0,
          pg: parseInt($(cells[1]).text().trim()) || 0,
          pe: parseInt($(cells[2]).text().trim()) || 0,
          pp: parseInt($(cells[3]).text().trim()) || 0,
          gf: parseInt($(cells[4]).text().trim()) || 0,
          gc: parseInt($(cells[5]).text().trim()) || 0,
          dif: parseInt($(cells[6]).text().trim()) || 0,
          pts: parseInt($(cells[7]).text().trim()) || 0
        }
      });
    }
  });

  return {
    liga: "Bundesliga",
    actualizado: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
    actualizadoISO: new Date().toISOString(),
    total: equipos.length,
    tabla: equipos
  };
}

module.exports = {
  name: "ESPN",
  url: "https://www.espn.com/soccer/standings/_/league/ger.1",
  scraper: scrapTablaBundesligaESPN
};

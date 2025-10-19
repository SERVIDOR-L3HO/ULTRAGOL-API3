const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../../utils/scraper");

async function scrapTablaSerieASoccerway() {
  const url = "https://us.soccerway.com/national/italy/serie-a/20242025/regular-season/r77801/tables/";
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);
  
  const equipos = [];
  
  $("table.leaguetable tr").each((i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 10) return;
    
    const posicion = $(cells[0]).text().trim();
    const equipo = $(cells[1]).find("a").text().trim() || $(cells[1]).text().trim();
    const pj = $(cells[2]).text().trim();
    const pg = $(cells[3]).text().trim();
    const pe = $(cells[4]).text().trim();
    const pp = $(cells[5]).text().trim();
    const gf = $(cells[6]).text().trim();
    const gc = $(cells[7]).text().trim();
    const dif = $(cells[8]).text().trim();
    const pts = $(cells[9]).text().trim();
    
    if (equipo && pts) {
      equipos.push({
        posicion: parseInt(posicion) || (i + 1),
        equipo: equipo,
        estadisticas: {
          pj: parseInt(pj) || 0,
          pg: parseInt(pg) || 0,
          pe: parseInt(pe) || 0,
          pp: parseInt(pp) || 0,
          gf: parseInt(gf) || 0,
          gc: parseInt(gc) || 0,
          dif: parseInt(dif) || 0,
          pts: parseInt(pts) || 0
        }
      });
    }
  });

  return {
    liga: "Serie A",
    actualizado: new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
    actualizadoISO: new Date().toISOString(),
    total: equipos.length,
    tabla: equipos
  };
}

module.exports = {
  name: "Soccerway",
  url: "https://us.soccerway.com/national/italy/serie-a/",
  scraper: scrapTablaSerieASoccerway
};

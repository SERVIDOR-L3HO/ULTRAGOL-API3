const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../../utils/scraper");

async function scrapTablaFlashscore() {
  const url = "https://www.flashscore.com/football/mexico/liga-mx/standings/";
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);
  
  const equipos = [];
  
  $(".ui-table__body .ui-table__row").each((i, row) => {
    const cells = $(row).find(".ui-table__cell");
    if (cells.length < 9) return;
    
    const equipoElement = $(cells[1]).find(".tableCellParticipant__name").text().trim() || 
                          $(cells[1]).text().trim();
    const pj = $(cells[2]).text().trim();
    const pg = $(cells[3]).text().trim();
    const pe = $(cells[4]).text().trim();
    const pp = $(cells[5]).text().trim();
    const gfgc = $(cells[6]).text().trim();
    const pts = $(cells[8]).text().trim();
    
    const [gf, gc] = gfgc.split(':').map(s => parseInt(s.trim()) || 0);
    const dif = (gf || 0) - (gc || 0);
    
    if (equipoElement && pts) {
      equipos.push({
        posicion: i + 1,
        equipo: equipoElement,
        estadisticas: {
          pj: parseInt(pj) || 0,
          pg: parseInt(pg) || 0,
          pe: parseInt(pe) || 0,
          pp: parseInt(pp) || 0,
          gf: gf || 0,
          gc: gc || 0,
          dif: dif,
          pts: parseInt(pts) || 0
        }
      });
    }
  });

  return {
    actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    actualizadoISO: new Date().toISOString(),
    total: equipos.length,
    tabla: equipos
  };
}

module.exports = {
  name: "FlashScore",
  url: "https://www.flashscore.com/football/mexico/liga-mx/",
  scraper: scrapTablaFlashscore
};

const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../../utils/scraper");

async function scrapTablaMediotiempo() {
  const url = "https://www.mediotiempo.com/futbol/liga-mx/tabla-general";
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);
  
  const equipos = [];
  
  $("table tbody tr").each((i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 10) return;
    
    const posicion = $(cells[1]).text().trim();
    const equipoElement = $(cells[2]).find("a").text().trim() || $(cells[2]).text().trim();
    const pts = $(cells[3]).text().trim();
    const pj = $(cells[4]).text().trim();
    const pg = $(cells[5]).text().trim();
    const pe = $(cells[6]).text().trim();
    const pp = $(cells[7]).text().trim();
    const gf = $(cells[8]).text().trim();
    const gc = $(cells[9]).text().trim();
    const dif = $(cells[10]).text().trim();
    
    if (equipoElement && pts) {
      equipos.push({
        posicion: parseInt(posicion) || (i + 1),
        equipo: equipoElement,
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
    actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    actualizadoISO: new Date().toISOString(),
    total: equipos.length,
    tabla: equipos
  };
}

module.exports = {
  name: "Mediotiempo",
  url: "https://www.mediotiempo.com/futbol/liga-mx/tabla-general",
  scraper: scrapTablaMediotiempo
};

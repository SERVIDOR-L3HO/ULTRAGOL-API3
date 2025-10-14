const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapTabla() {
  try {
    const url = "https://www.espn.com.mx/futbol/posiciones/_/liga/mex.1";
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
        const pj = $(cells[0]).text().trim();
        const pg = $(cells[1]).text().trim();
        const pe = $(cells[2]).text().trim();
        const pp = $(cells[3]).text().trim();
        const gf = $(cells[4]).text().trim();
        const gc = $(cells[5]).text().trim();
        const dif = $(cells[6]).text().trim();
        const pts = $(cells[7]).text().trim();
        
        equipos.push({
          posicion: i + 1,
          equipo: nombresEquipos[i],
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
      total: equipos.length,
      tabla: equipos
    };
  } catch (error) {
    console.error("Error scraping tabla:", error.message);
    throw error;
  }
}

module.exports = { scrapTabla };

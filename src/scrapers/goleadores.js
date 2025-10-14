const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapGoleadores() {
  try {
    const url = "https://www.espn.com.mx/futbol/estadisticas/_/liga/mex.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const goleadores = [];
    let posicion = 1;
    
    $("table tbody tr").slice(0, 20).each((i, row) => {
      const cells = $(row).find("td");
      
      if (cells.length >= 4) {
        const posCell = $(cells[0]).text().trim();
        if (posCell && !isNaN(posCell)) {
          posicion = parseInt(posCell);
        }
        
        const nombre = $(cells[1]).find("a").text().trim() || $(cells[1]).text().trim();
        const equipo = $(cells[2]).find("a").text().trim() || $(cells[2]).text().trim();
        const goles = $(cells[4]).text().trim();
        
        if (nombre && goles) {
          goleadores.push({
            posicion: posicion,
            jugador: nombre,
            equipo: equipo || "Sin equipo",
            goles: parseInt(goles) || 0
          });
        }
      }
    });

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: goleadores.length,
      goleadores: goleadores
    };
  } catch (error) {
    console.error("Error scraping goleadores:", error.message);
    throw error;
  }
}

module.exports = { scrapGoleadores };

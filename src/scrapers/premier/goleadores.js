const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");

async function scrapGoleadoresPremier() {
  try {
    const url = "https://www.espn.com/soccer/stats/_/league/ENG.1/season/2025/view/scoring";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const goleadores = [];
    
    $("table tbody tr").slice(0, 20).each((i, row) => {
      const cells = $(row).find("td");
      
      if (cells.length >= 4) {
        const nombreCompleto = $(cells[1]).find("a").text().trim();
        const equipo = $(cells[2]).text().trim();
        const goles = $(cells[3]).text().trim();
        
        if (nombreCompleto && goles) {
          goleadores.push({
            posicion: i + 1,
            jugador: nombreCompleto,
            equipo: equipo,
            goles: parseInt(goles) || 0
          });
        }
      }
    });

    return {
      liga: "Premier League",
      actualizado: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
      total: goleadores.length,
      goleadores: goleadores
    };
  } catch (error) {
    console.error("Error scraping goleadores Premier League:", error.message);
    throw error;
  }
}

module.exports = { scrapGoleadoresPremier };

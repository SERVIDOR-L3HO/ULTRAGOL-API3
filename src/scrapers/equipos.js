const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapEquipos() {
  try {
    const url = "https://www.espn.com.mx/futbol/posiciones/_/liga/mex.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const equipos = [];
    const equiposSet = new Set();
    
    $("table tbody tr").each((i, row) => {
      const primeraColumna = $(row).find("td").first();
      const enlaceEquipo = primeraColumna.find("a").last();
      const equipo = enlaceEquipo.text().trim();
      const enlace = enlaceEquipo.attr("href");
      
      if (equipo && !equiposSet.has(equipo)) {
        equiposSet.add(equipo);
        
        const urlCompleta = enlace ? `https://www.espn.com.mx${enlace}` : null;
        
        equipos.push({
          id: i + 1,
          nombre: equipo,
          nombreCorto: equipo.substring(0, 3).toUpperCase(),
          url: urlCompleta,
          liga: "Liga MX"
        });
      }
    });

    const equiposOrdenados = equipos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: equiposOrdenados.length,
      equipos: equiposOrdenados
    };
  } catch (error) {
    console.error("Error scraping equipos:", error.message);
    throw error;
  }
}

module.exports = { scrapEquipos };

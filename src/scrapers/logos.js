const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapLogos() {
  try {
    const url = "https://www.espn.com.mx/futbol/posiciones/_/liga/mex.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const logos = [];
    const equiposMap = {
      "Toluca": "toluca",
      "América": "america",
      "Monterrey": "monterrey",
      "Cruz Azul": "cruz-azul",
      "Tigres UANL": "tigres",
      "Pumas UNAM": "pumas",
      "UNAM": "pumas",
      "Guadalajara": "chivas",
      "Atlas": "atlas",
      "Santos Laguna": "santos",
      "Tijuana": "tijuana",
      "León": "leon",
      "Pachuca": "pachuca",
      "Puebla": "puebla",
      "Mazatlán FC": "mazatlan",
      "Querétaro": "queretaro",
      "Necaxa": "necaxa",
      "Juárez": "fc-juarez",
      "Atlético San Luis": "atletico-san-luis"
    };
    
    const equiposUnicos = new Set();
    
    $("table tbody tr").each((i, row) => {
      const equipo = $(row).find("td").first().find("span.hide-mobile").text().trim();
      
      if (equipo && !equiposUnicos.has(equipo) && equiposMap[equipo]) {
        equiposUnicos.add(equipo);
        const slug = equiposMap[equipo];
        const logoBase = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${slug}.png`;
        
        logos.push({
          equipo: equipo,
          slug: slug,
          logo: logoBase + "&h=200&w=200",
          logo_pequeño: logoBase + "&h=50&w=50",
          logo_mediano: logoBase + "&h=100&w=100",
          logo_grande: logoBase + "&h=300&w=300"
        });
      }
    });

    if (logos.length === 0) {
      Object.entries(equiposMap).forEach(([nombre, slug]) => {
        const logoBase = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${slug}.png`;
        logos.push({
          equipo: nombre,
          slug: slug,
          logo: logoBase + "&h=200&w=200",
          logo_pequeño: logoBase + "&h=50&w=50",
          logo_mediano: logoBase + "&h=100&w=100",
          logo_grande: logoBase + "&h=300&w=300"
        });
      });
    }

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: logos.length,
      logos: logos.sort((a, b) => a.equipo.localeCompare(b.equipo))
    };
  } catch (error) {
    console.error("Error scraping logos:", error.message);
    throw error;
  }
}

module.exports = { scrapLogos };

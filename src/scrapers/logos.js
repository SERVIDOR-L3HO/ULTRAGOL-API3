const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapLogos() {
  try {
    const url = "https://www.espn.com.mx/futbol/posiciones/_/liga/mex.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const logos = [];
    const equiposUnicos = new Set();
    
    $("table tbody tr").each((i, row) => {
      const equipo = $(row).find("td").first().find("span.hide-mobile").text().trim();
      const logoImg = $(row).find("td").first().find("img").attr("src");
      
      if (equipo && logoImg && !equiposUnicos.has(equipo)) {
        equiposUnicos.add(equipo);
        
        let logoUrl = logoImg;
        if (logoUrl && logoUrl.includes("&h=")) {
          logoUrl = logoUrl.replace(/&h=\d+/, "&h=200").replace(/&w=\d+/, "&w=200");
        }
        
        logos.push({
          equipo: equipo,
          logo: logoUrl,
          logo_pequeño: logoUrl.replace("&h=200", "&h=50").replace("&w=200", "&w=50"),
          logo_mediano: logoUrl.replace("&h=200", "&h=100").replace("&w=200", "&w=100"),
          logo_grande: logoUrl
        });
      }
    });

    if (logos.length === 0) {
      const equiposDefault = [
        { nombre: "América", slug: "america" },
        { nombre: "Atlas", slug: "atlas" },
        { nombre: "Atlético San Luis", slug: "atletico-san-luis" },
        { nombre: "Cruz Azul", slug: "cruz-azul" },
        { nombre: "Guadalajara", slug: "chivas" },
        { nombre: "Juárez", slug: "fc-juarez" },
        { nombre: "León", slug: "leon" },
        { nombre: "Mazatlán FC", slug: "mazatlan" },
        { nombre: "Monterrey", slug: "monterrey" },
        { nombre: "Necaxa", slug: "necaxa" },
        { nombre: "Pachuca", slug: "pachuca" },
        { nombre: "Puebla", slug: "puebla" },
        { nombre: "Querétaro", slug: "queretaro" },
        { nombre: "Santos Laguna", slug: "santos" },
        { nombre: "Tigres UANL", slug: "tigres" },
        { nombre: "Tijuana", slug: "tijuana" },
        { nombre: "Toluca", slug: "toluca" },
        { nombre: "UNAM", slug: "pumas" }
      ];

      equiposDefault.forEach(equipo => {
        const logoBase = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${equipo.slug}.png`;
        logos.push({
          equipo: equipo.nombre,
          logo: logoBase + "&h=200&w=200",
          logo_pequeño: logoBase + "&h=50&w=50",
          logo_mediano: logoBase + "&h=100&w=100",
          logo_grande: logoBase + "&h=200&w=200"
        });
      });
    }

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: logos.length,
      logos: logos
    };
  } catch (error) {
    console.error("Error scraping logos:", error.message);
    throw error;
  }
}

module.exports = { scrapLogos };

const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");

async function scrapNoticiasLigue1() {
  try {
    const url = "https://www.espn.com/soccer/league/_/name/fra.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const noticias = [];
    const fuente = "ESPN";
    
    $("article, .contentItem").slice(0, 15).each((i, article) => {
      const titulo = $(article).find("h1, h2, h3").first().text().trim();
      const descripcion = $(article).find("p, .contentItem__subhead").first().text().trim();
      const enlace = $(article).find("a").first().attr("href");
      
      let imagen = $(article).find("img").first().attr("src") || 
                   $(article).find("img").first().attr("data-default-src");
      
      if (titulo && enlace) {
        const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.espn.com${enlace}`;
        
        noticias.push({
          titulo: titulo,
          descripcion: descripcion || "Aucune description disponible",
          url: urlCompleta,
          imagen: imagen || "https://via.placeholder.com/600x400?text=No+Image",
          fuente: fuente,
          fecha: new Date().toLocaleDateString("fr-FR"),
          hora: new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    return {
      liga: "Ligue 1",
      actualizado: new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" }),
      total: noticias.length,
      fuente: fuente,
      noticias: noticias
    };
  } catch (error) {
    console.error("Error scraping noticias Ligue 1:", error.message);
    throw error;
  }
}

module.exports = { scrapNoticiasLigue1 };

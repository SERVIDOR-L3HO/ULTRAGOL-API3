const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");
const { scrapNoticiasConContenido } = require("../../utils/articleExtractor");

async function scrapNoticiasSerieA(incluirContenido = true) {
  try {
    const url = "https://www.espn.com/soccer/league/_/name/ita.1";
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
          descripcion: descripcion || "Nessuna descrizione disponibile",
          url: urlCompleta,
          imagen: imagen || "https://via.placeholder.com/600x400?text=No+Image",
          fuente: fuente,
          fecha: new Date().toLocaleDateString("it-IT"),
          hora: new Date().toLocaleTimeString("it-IT", { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    let noticiasFinales = noticias;
    if (incluirContenido && noticias.length > 0) {
      console.log("📰 Extrayendo contenido completo de artículos de Serie A...");
      noticiasFinales = await scrapNoticiasConContenido(noticias, 5);
    }

    return {
      liga: "Serie A",
      actualizado: new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
      total: noticiasFinales.length,
      fuente: fuente,
      nota: "El campo 'contenido' incluye el texto completo del artículo cuando está disponible",
      noticias: noticiasFinales
    };
  } catch (error) {
    console.error("Error scraping noticias Serie A:", error.message);
    throw error;
  }
}

module.exports = { scrapNoticiasSerieA };

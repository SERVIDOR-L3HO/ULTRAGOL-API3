const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapNoticias() {
  try {
    const url = "https://www.mediotiempo.com/futbol/liga-mx";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const noticias = [];
    
    $("article.article-item, .nota, .noticia, article").slice(0, 15).each((i, article) => {
      const titulo = $(article).find("h2, h3, .title, .titular").first().text().trim();
      const descripcion = $(article).find("p, .description, .summary").first().text().trim();
      const enlace = $(article).find("a").first().attr("href");
      const imagen = $(article).find("img").first().attr("src") || 
                     $(article).find("img").first().attr("data-src");
      
      if (titulo && enlace) {
        const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.mediotiempo.com${enlace}`;
        
        noticias.push({
          titulo: titulo,
          descripcion: descripcion || "Sin descripción disponible",
          url: urlCompleta,
          imagen: imagen || null,
          fecha: new Date().toLocaleDateString("es-MX")
        });
      }
    });

    if (noticias.length === 0) {
      $("div.story-card, div.news-item").slice(0, 15).each((i, item) => {
        const titulo = $(item).find("h2, h3, h4").first().text().trim();
        const descripcion = $(item).find("p").first().text().trim();
        const enlace = $(item).find("a").first().attr("href");
        
        if (titulo && enlace) {
          const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.mediotiempo.com${enlace}`;
          
          noticias.push({
            titulo: titulo,
            descripcion: descripcion || "Sin descripción disponible",
            url: urlCompleta,
            imagen: null,
            fecha: new Date().toLocaleDateString("es-MX")
          });
        }
      });
    }

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: noticias.length,
      noticias: noticias
    };
  } catch (error) {
    console.error("Error scraping noticias:", error.message);
    throw error;
  }
}

module.exports = { scrapNoticias };

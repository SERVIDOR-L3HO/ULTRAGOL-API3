const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");
const { scrapNoticiasConContenido } = require("../../utils/articleExtractor");

async function scrapNoticiasPremier(incluirContenido = true) {
  try {
    const url = "https://www.bbc.com/sport/football/premier-league";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const noticias = [];
    const fuente = "BBC Sport";
    
    $("article, .ssrcss-1mrs5ns-PromoContent").slice(0, 15).each((i, article) => {
      const titulo = $(article).find("h2, h3, .ssrcss-15xko80-StyledHeading").first().text().trim();
      const descripcion = $(article).find("p, .ssrcss-1q0x1qg-Paragraph").first().text().trim();
      const enlace = $(article).find("a").first().attr("href");
      
      let imagen = $(article).find("img").first().attr("src") || 
                   $(article).find("img").first().attr("data-src");
      
      if (imagen && !imagen.startsWith("http")) {
        imagen = imagen.startsWith("//") ? `https:${imagen}` : `https://www.bbc.com${imagen}`;
      }
      
      if (titulo && enlace) {
        const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.bbc.com${enlace}`;
        
        noticias.push({
          titulo: titulo,
          descripcion: descripcion || "No description available",
          url: urlCompleta,
          imagen: imagen || "https://via.placeholder.com/600x400?text=No+Image",
          fuente: fuente,
          fecha: new Date().toLocaleDateString("en-GB"),
          hora: new Date().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    if (noticias.length === 0) {
      $("div[data-testid='card-headline'], .gel-layout__item").slice(0, 15).each((i, item) => {
        const titulo = $(item).find("h2, h3").first().text().trim();
        const descripcion = $(item).find("p").first().text().trim();
        const enlace = $(item).find("a").first().attr("href");
        let imagen = $(item).find("img").first().attr("src");
        
        if (imagen && !imagen.startsWith("http")) {
          imagen = imagen.startsWith("//") ? `https:${imagen}` : `https://www.bbc.com${imagen}`;
        }
        
        if (titulo && enlace) {
          const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.bbc.com${enlace}`;
          
          noticias.push({
            titulo: titulo,
            descripcion: descripcion || "No description available",
            url: urlCompleta,
            imagen: imagen || "https://via.placeholder.com/600x400?text=No+Image",
            fuente: fuente,
            fecha: new Date().toLocaleDateString("en-GB"),
            hora: new Date().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })
          });
        }
      });
    }

    let noticiasFinales = noticias;
    if (incluirContenido && noticias.length > 0) {
      console.log("📰 Extrayendo contenido completo de artículos de Premier League...");
      noticiasFinales = await scrapNoticiasConContenido(noticias, 5);
    }

    return {
      liga: "Premier League",
      actualizado: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
      total: noticiasFinales.length,
      fuente: fuente,
      nota: "El campo 'contenido' incluye el texto completo del artículo cuando está disponible",
      noticias: noticiasFinales
    };
  } catch (error) {
    console.error("Error scraping noticias Premier League:", error.message);
    throw error;
  }
}

module.exports = { scrapNoticiasPremier };

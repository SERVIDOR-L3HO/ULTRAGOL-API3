const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");
const { scrapNoticiasConContenido } = require("../utils/articleExtractor");

async function scrapNoticias(incluirContenido = true) {
  try {
    const url = "https://www.mediotiempo.com/futbol/liga-mx";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const noticias = [];
    const fuente = "Mediotiempo";
    
    $("article.article-item, .nota, .noticia, article").slice(0, 15).each((i, article) => {
      const titulo = $(article).find("h2, h3, .title, .titular").first().text().trim();
      const descripcion = $(article).find("p, .description, .summary").first().text().trim();
      const enlace = $(article).find("a").first().attr("href");
      
      let imagen = $(article).find("img").first().attr("src") || 
                   $(article).find("img").first().attr("data-src") ||
                   $(article).find("img").first().attr("data-lazy-src");
      
      if (imagen && !imagen.startsWith("http")) {
        imagen = imagen.startsWith("//") ? `https:${imagen}` : `https://www.mediotiempo.com${imagen}`;
      }
      
      const textoCompleto = $(article).find("p").map((i, el) => $(el).text().trim()).get().join(" ").trim();
      
      if (titulo && enlace) {
        const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.mediotiempo.com${enlace}`;
        
        noticias.push({
          titulo: titulo,
          descripcion: descripcion || "Sin descripción disponible",
          resumen: textoCompleto || descripcion || "Sin contenido disponible",
          url: urlCompleta,
          imagen: imagen || "https://via.placeholder.com/600x400?text=Sin+Imagen",
          fuente: fuente,
          fecha: new Date().toLocaleDateString("es-MX"),
          hora: new Date().toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    if (noticias.length === 0) {
      $("div.story-card, div.news-item").slice(0, 15).each((i, item) => {
        const titulo = $(item).find("h2, h3, h4").first().text().trim();
        const descripcion = $(item).find("p").first().text().trim();
        const enlace = $(item).find("a").first().attr("href");
        let imagen = $(item).find("img").first().attr("src") || 
                     $(item).find("img").first().attr("data-src");
        
        if (imagen && !imagen.startsWith("http")) {
          imagen = imagen.startsWith("//") ? `https:${imagen}` : `https://www.mediotiempo.com${imagen}`;
        }
        
        if (titulo && enlace) {
          const urlCompleta = enlace.startsWith("http") ? enlace : `https://www.mediotiempo.com${enlace}`;
          
          noticias.push({
            titulo: titulo,
            descripcion: descripcion || "Sin descripción disponible",
            resumen: descripcion || "Sin contenido disponible",
            url: urlCompleta,
            imagen: imagen || "https://via.placeholder.com/600x400?text=Sin+Imagen",
            fuente: fuente,
            fecha: new Date().toLocaleDateString("es-MX"),
            hora: new Date().toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })
          });
        }
      });
    }

    let noticiasFinales = noticias;
    if (incluirContenido && noticias.length > 0) {
      console.log("📰 Extrayendo contenido completo de artículos de Liga MX...");
      noticiasFinales = await scrapNoticiasConContenido(noticias, 5);
    }

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: noticiasFinales.length,
      fuente: fuente,
      nota: "El campo 'contenido' incluye el texto completo del artículo cuando está disponible",
      noticias: noticiasFinales
    };
  } catch (error) {
    console.error("Error scraping noticias:", error.message);
    throw error;
  }
}

module.exports = { scrapNoticias };

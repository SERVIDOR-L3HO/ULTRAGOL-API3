const cheerio = require("cheerio");
const { fetchWithRetry } = require("./scraper");

async function extractArticleContent(url, fuente) {
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    $("script, style, nav, header, footer, aside, .ads, .advertisement, .social-share, .comments, .related-articles").remove();
    
    let contenido = "";
    let parrafos = [];
    
    if (fuente === "Mediotiempo" || url.includes("mediotiempo.com")) {
      parrafos = $("article p, .article-body p, .content p, .story-body p, main p").map((i, el) => $(el).text().trim()).get();
    } else if (fuente === "ESPN" || url.includes("espn.com")) {
      parrafos = $("article p, .article-body p, .story-body p, [data-testid='article-body'] p, .ArticleBody p").map((i, el) => $(el).text().trim()).get();
    } else if (fuente === "BBC Sport" || url.includes("bbc.com")) {
      parrafos = $("article p, [data-component='text-block'] p, .ssrcss-1q0x1qg-Paragraph, main p").map((i, el) => $(el).text().trim()).get();
    } else {
      parrafos = $("article p, .article-body p, .content p, .story-body p, main p, .post-content p").map((i, el) => $(el).text().trim()).get();
    }
    
    parrafos = parrafos.filter(p => p.length > 20);
    contenido = parrafos.join("\n\n");
    
    if (!contenido || contenido.length < 100) {
      parrafos = $("p").map((i, el) => $(el).text().trim()).get().filter(p => p.length > 30);
      contenido = parrafos.slice(0, 10).join("\n\n");
    }
    
    return contenido || "No se pudo extraer el contenido del artículo";
  } catch (error) {
    console.error(`Error extrayendo contenido de ${url}:`, error.message);
    return "Error al obtener el contenido del artículo";
  }
}

async function scrapNoticiasConContenido(noticias, maxArticulos = 5) {
  const noticiasConContenido = [];
  const articulosAProcesar = noticias.slice(0, maxArticulos);
  
  for (const noticia of articulosAProcesar) {
    try {
      console.log(`📰 Extrayendo contenido de: ${noticia.titulo.substring(0, 50)}...`);
      const contenido = await extractArticleContent(noticia.url, noticia.fuente);
      noticiasConContenido.push({
        ...noticia,
        contenido: contenido,
        contenidoDisponible: contenido !== "No se pudo extraer el contenido del artículo" && contenido !== "Error al obtener el contenido del artículo"
      });
    } catch (error) {
      noticiasConContenido.push({
        ...noticia,
        contenido: "Error al obtener el contenido",
        contenidoDisponible: false
      });
    }
  }
  
  for (const noticia of noticias.slice(maxArticulos)) {
    noticiasConContenido.push({
      ...noticia,
      contenido: "Contenido disponible bajo demanda - visita la URL para más información",
      contenidoDisponible: false
    });
  }
  
  return noticiasConContenido;
}

module.exports = { extractArticleContent, scrapNoticiasConContenido };

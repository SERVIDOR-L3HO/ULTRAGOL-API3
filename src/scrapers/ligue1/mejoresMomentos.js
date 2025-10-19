const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");

async function scrapMejoresMomentosLigue1() {
  try {
    const queries = [
      'Ligue 1 mejores momentos',
      'Ligue 1 highlights',
      'Ligue 1 best moments',
      'Ligue 1 goals',
      'Ligue 1 resumen'
    ];
    
    const allVideos = [];
    const videosUnicos = new Set();
    
    for (const query of queries) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      
      try {
        const html = await fetchWithRetry(searchUrl);
        const $ = cheerio.load(html);
        
        const scriptTags = $('script').toArray();
        
        for (const script of scriptTags) {
          const scriptContent = $(script).html();
          if (scriptContent && scriptContent.includes('var ytInitialData')) {
            const jsonMatch = scriptContent.match(/var ytInitialData = ({.*?});/);
            if (jsonMatch) {
              try {
                const data = JSON.parse(jsonMatch[1]);
                const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
                
                if (contents) {
                  for (const section of contents) {
                    const items = section?.itemSectionRenderer?.contents || [];
                    
                    for (const item of items) {
                      const videoRenderer = item?.videoRenderer;
                      if (videoRenderer && !videosUnicos.has(videoRenderer.videoId)) {
                        videosUnicos.add(videoRenderer.videoId);
                        
                        const titulo = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText || 'Sin título';
                        const descripcion = videoRenderer.descriptionSnippet?.runs?.map(r => r.text).join('') || 'Sin descripción';
                        const canal = videoRenderer.ownerText?.runs?.[0]?.text || 'Canal desconocido';
                        const thumbnail = videoRenderer.thumbnail?.thumbnails?.[videoRenderer.thumbnail.thumbnails.length - 1]?.url || '';
                        const duracion = videoRenderer.lengthText?.simpleText || '';
                        const vistas = videoRenderer.viewCountText?.simpleText || '0 vistas';
                        const fecha = videoRenderer.publishedTimeText?.simpleText || 'Fecha desconocida';
                        
                        const videoData = {
                          id: videoRenderer.videoId,
                          titulo: titulo,
                          descripcion: descripcion,
                          canal: canal,
                          thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
                          duracion: duracion,
                          vistas: vistas,
                          fechaPublicacion: fecha,
                          url: `https://www.youtube.com/watch?v=${videoRenderer.videoId}`,
                          urlEmbed: `https://www.youtube.com/embed/${videoRenderer.videoId}`,
                          categoria: determinarCategoria(titulo, descripcion)
                        };
                        
                        allVideos.push(videoData);
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.error('Error parseando datos de YouTube:', parseError.message);
              }
            }
          }
        }
      } catch (queryError) {
        console.error(`Error buscando "${query}":`, queryError.message);
      }
    }
    
    const categorias = {
      mejoresMomentos: allVideos.filter(v => v.categoria === 'mejores_momentos'),
      resumenes: allVideos.filter(v => v.categoria === 'resumen'),
      repeticiones: allVideos.filter(v => v.categoria === 'repeticion'),
      highlights: allVideos.filter(v => v.categoria === 'highlights'),
      otros: allVideos.filter(v => v.categoria === 'otros')
    };
    
    return {
      liga: "Ligue 1",
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: allVideos.length,
      fuente: "YouTube",
      nota: "Videos obtenidos mediante scraping web",
      categorias: categorias,
      videos: allVideos.slice(0, 50)
    };
  } catch (error) {
    console.error("Error obteniendo mejores momentos de Ligue 1:", error.message);
    throw error;
  }
}

function determinarCategoria(titulo, descripcion) {
  const texto = (titulo + ' ' + descripcion).toLowerCase();
  
  if (texto.includes('mejores momentos') || texto.includes('best moments')) {
    return 'mejores_momentos';
  }
  if (texto.includes('resumen') || texto.includes('summary')) {
    return 'resumen';
  }
  if (texto.includes('repetición') || texto.includes('repeticion') || texto.includes('replay')) {
    return 'repeticion';
  }
  if (texto.includes('highlights') || texto.includes('highlight')) {
    return 'highlights';
  }
  
  return 'otros';
}

module.exports = { scrapMejoresMomentosLigue1 };

const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapTransmisiones2() {
  try {
    const url = "https://dp.mycraft.click/home.html";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const transmisiones = [];
    
    // Buscar todas las filas de la tabla w3-table-all
    $("table.w3-table-all tr").each((index, element) => {
      const $row = $(element);
      const celdas = $row.find("td.w3-border");
      
      // Ignorar filas de cabecera y separadores (que no tienen 5 columnas o están vacías)
      if (celdas.length === 5) {
        // Extraer datos de cada celda
        const hora = $(celdas[0]).text().trim();
        const categoria = $(celdas[1]).text().trim();
        const infoCompleto = $(celdas[2]).text().trim();
        const tituloCompleto = $(celdas[3]).text().trim();
        
        // Extraer el enlace del input en la última celda
        const enlace = $(celdas[4]).find("input").val() || "";
        
        // Limpiar el título para remover el indicador de estado (dot)
        const titulo = tituloCompleto.replace(/^[•●◉○]\s*/, '').trim();
        
        // Solo agregar si tiene información válida (hora, categoria, titulo y enlace)
        if (hora && categoria && titulo && enlace) {
          transmisiones.push({
            hora: hora,
            deporte: categoria,
            info: infoCompleto || "N/A",
            liga: infoCompleto || "N/A",
            titulo: titulo,
            evento: titulo,
            url: enlace,
            estado: tituloCompleto.includes("●") || tituloCompleto.includes("stopdot") ? "En vivo" : 
                    tituloCompleto.includes("◉") || tituloCompleto.includes("readydot") ? "Por comenzar" : 
                    "Programado"
          });
        }
      }
    });
    
    // Agrupar por deporte para estadísticas
    const deportes = {};
    transmisiones.forEach(t => {
      if (!deportes[t.deporte]) {
        deportes[t.deporte] = 0;
      }
      deportes[t.deporte]++;
    });
    
    console.log(`📺 Transmisiones2 procesadas: ${transmisiones.length}`);
    console.log(`🏆 Deportes disponibles: ${Object.keys(deportes).join(", ")}`);
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "dp.mycraft.click",
      deportes: deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones de dp.mycraft.click: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones2 };

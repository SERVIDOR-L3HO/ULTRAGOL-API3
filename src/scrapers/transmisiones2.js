const cheerio = require("cheerio");
const axios = require("axios");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const GLZ_PROXY = "https://cmrroto01.blogspot.com/p/aldoblock.html?get=";

async function scrapTransmisiones2() {
  try {
    const url = "https://dp.mycraft.click/home.html";
    
    // Estrategia con múltiples reintentos y headers mejorados
    let html = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Headers específicos para dp.mycraft.click con rotación de User-Agent
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ];
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": userAgents[attempt - 1],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
            "Connection": "keep-alive"
          },
          timeout: 25000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        });
        
        if (response.status === 200) {
          html = response.data;
          break;
        } else if (response.status === 403 || response.status === 429) {
          // Esperar más tiempo antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          lastError = new Error(`HTTP ${response.status} - Acceso bloqueado, reintentando...`);
          continue;
        } else {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    
    if (!html) {
      throw lastError || new Error("No se pudo obtener el HTML después de 3 intentos");
    }
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
          const equiposLogos = extraerEquiposYLogos(titulo);
          
          transmisiones.push({
            hora: hora,
            deporte: categoria,
            info: infoCompleto || "N/A",
            liga: infoCompleto || "N/A",
            titulo: titulo,
            evento: titulo,
            equipo1: equiposLogos.equipo1,
            equipo2: equiposLogos.equipo2,
            logo1: equiposLogos.logo1,
            logo2: equiposLogos.logo2,
            url: GLZ_PROXY + encodeURIComponent(enlace),
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
    
    // Si el error es 403 (bloqueado), retornar mensaje informativo
    if (error.message.includes("403") || error.message.includes("Acceso bloqueado")) {
      console.log("⚠️ El sitio dp.mycraft.click está bloqueando las peticiones desde este servidor");
      console.log("💡 Sugerencia: Los datos se cachean por 30 minutos. Si necesitas acceso más frecuente, considera usar un proxy.");
      
      return {
        total: 0,
        actualizado: new Date().toISOString(),
        fuente: "dp.mycraft.click",
        error: "Acceso bloqueado por el sitio web. El sitio está bloqueando peticiones desde servidores de hosting. Los datos se cachean por 30 minutos cuando están disponibles.",
        sugerencia: "Considera usar un servicio de proxy o consultar el endpoint en horarios de menor tráfico.",
        deportes: {},
        deportesDisponibles: [],
        transmisiones: []
      };
    }
    
    throw new Error(`No se pudieron obtener las transmisiones de dp.mycraft.click: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones2 };

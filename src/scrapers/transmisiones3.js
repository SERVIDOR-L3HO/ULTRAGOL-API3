const cheerio = require("cheerio");
const axios = require("axios");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

async function scrapTransmisiones3() {
  try {
    const url = "https://e1link.link/";
    
    let html = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    
    if (!html) {
      throw lastError || new Error("No se pudo obtener el HTML después de 3 intentos");
    }
    
    const $ = cheerio.load(html);
    const transmisiones = [];
    
    $('.row').each((index, element) => {
      const $row = $(element);
      
      const gmtTime = $row.find('[data-gmt-time]').attr('data-gmt-time');
      const horaDisplay = $row.find('[data-gmt-time]').text().trim();
      
      const titulo = $row.find('.flex-1 .text-sm').text().trim();
      
      const deporteInfo = $row.find('.flex-1 .muted').text().trim();
      let [liga, deporte] = deporteInfo.split('·').map(s => s.trim());
      if (!deporte) {
        deporte = liga;
        liga = "N/A";
      }
      
      const onclick = $row.attr('onclick');
      let enlaces = [];
      let canal = "N/A";
      let channelId = "N/A";
      
      if (onclick) {
        const match = onclick.match(/toggleRow\('([^']+)'/);
        if (match && match[1]) {
          const detailsId = match[1];
          const $details = $(`#${detailsId}`);
          
          $details.find('.badge-tv').each((i, badge) => {
            canal = $(badge).text().trim();
          });
          
          $details.find('.badge-id').each((i, badge) => {
            const idText = $(badge).text().trim();
            channelId = idText.replace('ID ', '');
          });
          
          $details.find('input[value^="https://"]').each((i, input) => {
            const enlace = $(input).attr('value');
            if (enlace && enlace.includes('e1link.link')) {
              enlaces.push(enlace);
            }
          });
        }
      }
      
      if (titulo && titulo !== '--:--' && enlaces.length > 0) {
        const fecha = new Date(parseInt(gmtTime) * 1000);
        const horaFormateada = fecha.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Mexico_City'
        });
        
        const ahora = Date.now();
        const tiempoEvento = parseInt(gmtTime) * 1000;
        const diferencia = tiempoEvento - ahora;
        
        let estado = "Programado";
        if (diferencia < 0 && diferencia > -10800000) {
          estado = "En vivo";
        } else if (diferencia > 0 && diferencia < 900000) {
          estado = "Por comenzar";
        }
        
        const urlConPrefijo = enlaces[0];
        const enlacesConPrefijo = enlaces;
        const equiposLogos = extraerEquiposYLogos(titulo);
        
        transmisiones.push({
          hora: `${horaFormateada} UTC-6`,
          gmtTimestamp: gmtTime,
          deporte: deporte.toUpperCase(),
          liga: liga,
          info: liga,
          titulo: titulo,
          evento: titulo,
          equipo1: equiposLogos.equipo1,
          equipo2: equiposLogos.equipo2,
          logo1: equiposLogos.logo1,
          logo2: equiposLogos.logo2,
          canal: canal,
          channelId: channelId,
          url: urlConPrefijo,
          enlaces: enlacesConPrefijo,
          estado: estado
        });
      }
    });
    
    const deportes = {};
    transmisiones.forEach(t => {
      if (!deportes[t.deporte]) {
        deportes[t.deporte] = 0;
      }
      deportes[t.deporte]++;
    });
    
    console.log(`📺 Transmisiones3 (e1link.link) procesadas: ${transmisiones.length}`);
    console.log(`🏆 Deportes disponibles: ${Object.keys(deportes).join(", ")}`);
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "e1link.link",
      deportes: deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones3:", error.message);
    
    if (error.message.includes("403") || error.message.includes("Acceso bloqueado")) {
      console.log("⚠️ El sitio e1link.link está bloqueando las peticiones desde este servidor");
      
      return {
        total: 0,
        actualizado: new Date().toISOString(),
        fuente: "e1link.link",
        error: "Acceso bloqueado por el sitio web. El sitio está bloqueando peticiones desde servidores de hosting.",
        sugerencia: "Los datos se cachean por 30 minutos cuando están disponibles.",
        deportes: {},
        deportesDisponibles: [],
        transmisiones: []
      };
    }
    
    throw new Error(`No se pudieron obtener las transmisiones de e1link.link: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones3 };

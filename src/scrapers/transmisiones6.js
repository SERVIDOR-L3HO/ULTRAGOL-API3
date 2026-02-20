const axios = require("axios");
const cheerio = require("cheerio");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const ULTRAGOL_PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";

const categoriaMap = {
  'SOCCER': 'Fútbol',
  'BASKETBALL': 'Baloncesto',
  'TENNIS': 'Tenis',
  'HANDBALL': 'Balonmano',
  'HOCKEY': 'Hockey',
  'VOLLEYBALL': 'Voleibol',
  'BASEBALL': 'Béisbol',
  'BOXING': 'Boxeo',
  'MMA': 'MMA',
  'UFC': 'UFC',
  'AMERICAN FOOTBALL': 'Fútbol Americano',
  'RUGBY': 'Rugby',
  'CRICKET': 'Cricket',
  'GOLF': 'Golf',
  'MOTORSPORT': 'Automovilismo',
  'F1': 'Fórmula 1',
  'NASCAR': 'NASCAR',
  'CYCLING': 'Ciclismo',
  'ESPORTS': 'E-Sports',
  'BILLIARD': 'Billar',
  'DARTS': 'Dardos',
  'LACROSSE': 'Lacrosse',
  'COMBAT SPORT': 'Deporte de combate'
};

function parseHora(horaStr) {
  if (!horaStr) return { hora: "Por confirmar", estado: "Programado" };
  
  const match = horaStr.match(/(\d{1,2}):(\d{2})\s*(?:UTC|GMT)?\s*([+-]?\d{1,2})?/i);
  if (!match) return { hora: horaStr, estado: "Programado" };
  
  try {
    const hh = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    const offset = match[3] ? parseInt(match[3], 10) : -5; // UTC-5 por defecto
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const utcHour = hh - offset;
    const eventUtcMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), utcHour, mm);
    const eventDate = new Date(eventUtcMs);
    
    const diffMs = eventDate.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);
    
    let estado = "Programado";
    if (diffMins <= 0 && diffMins > -180) {
      estado = "En vivo";
    } else if (diffMins > 0 && diffMins <= 30) {
      estado = "Por comenzar";
    }
    
    return { hora: horaStr, estado: estado, timestamp: eventDate };
  } catch (error) {
    return { hora: horaStr, estado: "Programado" };
  }
}

async function scrapTransmisiones6() {
  const startTime = Date.now();
  
  try {
    console.log("🔄 Obteniendo transmisiones desde dp.mycraft.click (UltraGol API)...");
    
    const url = "https://dp.mycraft.click/home.html";
    
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
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Referer": "https://dp.mycraft.click/"
          },
          timeout: 25000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        });
        
        if (response.status === 200) {
          html = response.data;
          console.log(`✅ HTML obtenido exitosamente desde dp.mycraft.click`);
          break;
        } else if (response.status === 403 || response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          lastError = new Error(`HTTP ${response.status} - Cloudflare bloqueado, reintentando...`);
          console.log(`⚠️ Intento ${attempt}: ${lastError.message}`);
          continue;
        } else {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Intento ${attempt} falló:`, error.message);
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
    let fechaActual = null;
    
    // Procesar la tabla HTML
    $('table.w3-table-all tr').each((index, element) => {
      const $row = $(element);
      
      // Detectar encabezado de fecha
      const $dateHeader = $row.find('td[colspan="9"]');
      if ($dateHeader.length > 0) {
        const textoFecha = $dateHeader.text().trim();
        if (textoFecha.includes('202')) {
          fechaActual = textoFecha;
          return;
        }
      }
      
      // Procesar filas de datos
      const $cells = $row.find('td.w3-border');
      if ($cells.length >= 5) {
        try {
          const horaStr = $cells.eq(0).text().trim();
          const categoria = $cells.eq(1).text().trim().toUpperCase();
          const info = $cells.eq(2).text().trim();
          const titulo = $cells.eq(3).text().trim();
          const $input = $cells.eq(4).find('input[type="text"]');
          const url = $input.val() || $input.attr('value');
          
          if (horaStr && categoria && titulo && url) {
            const { hora, estado } = parseHora(horaStr);
            const deporte = categoriaMap[categoria] || categoria;
            
            // Limpiar título de indicadores de estado
            const tituloLimpio = titulo
              .replace(/^<span.*?<\/span>\s*/, '')
              .replace(/^[✓✗✔✖🟢🟡🔴]\s*/, '')
              .trim();
            
            const equiposLogos = extraerEquiposYLogos(tituloLimpio);
            
            // Extraer el ID del canal de la URL original si es de bolaloca
            let finalUrl = url;
            if (url.includes('bolaloca.my/live/')) {
              const channelMatch = url.match(/\/live\/(\d+)/);
              if (channelMatch) {
                const channelId = channelMatch[1];
                finalUrl = `https://bolaloca.my/player/2/${channelId}`;
              }
            }

            transmisiones.push({
              hora: hora,
              fecha: fechaActual || new Date().toDateString(),
              deporte: deporte,
              categoria: categoria,
              liga: info,
              info: info,
              titulo: tituloLimpio,
              evento: tituloLimpio,
              equipo1: equiposLogos.equipo1,
              equipo2: equiposLogos.equipo2,
              logo1: equiposLogos.logo1,
              logo2: equiposLogos.logo2,
              url: ULTRAGOL_PROXY + encodeURIComponent(finalUrl),
              urlOriginal: finalUrl,
              estado: estado,
              fuente: "dp.mycraft.click"
            });
          }
        } catch (err) {
          console.error(`Error procesando fila ${index}:`, err.message);
        }
      }
    });
    
    const deportes = {};
    const ligas = {};
    
    transmisiones.forEach(t => {
      if (!deportes[t.deporte]) deportes[t.deporte] = 0;
      if (!ligas[t.liga]) ligas[t.liga] = 0;
      deportes[t.deporte]++;
      ligas[t.liga]++;
    });
    
    const elapsedTime = Date.now() - startTime;
    
    console.log(`📺 Transmisiones6 (dp.mycraft.click) procesadas: ${transmisiones.length} en ${elapsedTime}ms`);
    console.log(`🏆 Deportes: ${Object.keys(deportes).join(", ")}`);
    console.log(`🎯 Ligas principales: ${Object.keys(ligas).slice(0, 5).join(", ")}`);
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "dp.mycraft.click",
      fuenteOficial: "UltraGol API",
      deportes: deportes,
      deportesDisponibles: Object.keys(deportes),
      ligas: ligas,
      ligasDisponibles: Object.keys(ligas).slice(0, 20),
      elapsedTime: `${elapsedTime}ms`,
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones6:", error.message);
    
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "dp.mycraft.click",
      fuenteOficial: "UltraGol API",
      error: `Error obteniendo transmisiones: ${error.message}`,
      sugerencia: "La página podría estar bloqueada por Cloudflare o no disponible temporalmente",
      deportes: {},
      deportesDisponibles: [],
      ligas: {},
      ligasDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones6 };

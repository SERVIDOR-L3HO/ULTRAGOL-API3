const axios = require("axios");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const GLZ_PROXY = "https://cmrroto01.blogspot.com/p/aldoblock.html?get=";

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
  'FOOTBALL': 'Fútbol Americano',
  'RUGBY': 'Rugby',
  'CRICKET': 'Cricket',
  'GOLF': 'Golf',
  'MOTORSPORT': 'Automovilismo',
  'F1': 'Fórmula 1',
  'NASCAR': 'NASCAR',
  'CYCLING': 'Ciclismo',
  'ESPORTS': 'E-Sports'
};

function parseTimeToLocal(timeStr) {
  if (!timeStr) return { hora: "Por confirmar", estado: "Programado" };
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(?:UTC|GMT)?\s*([+-]?\d{1,2})?/i);
  if (!match) return { hora: timeStr, estado: "Programado" };
  
  const hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const offset = match[3] ? parseInt(match[3], 10) : 0;
  
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
  
  const horaLocal = eventDate.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  return { hora: horaLocal, estado: estado };
}

async function scrapTransmisiones2() {
  try {
    const jsonUrl = "https://locotv1993.github.io/player/voodc.json";
    
    let data = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.get(jsonUrl, {
          headers: {
            "Accept": "application/json",
            "Cache-Control": "no-cache"
          },
          timeout: 15000
        });
        
        if (response.status === 200 && response.data) {
          data = response.data;
          break;
        }
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    if (!data || !data.events) {
      throw lastError || new Error("No se pudo obtener los eventos del JSON");
    }
    
    const transmisiones = [];
    const events = Array.isArray(data.events) ? data.events : [];
    
    events.forEach((event, index) => {
      try {
        const { time, category, info, title, url } = event;
        
        if (!title || !url) return;
        
        const { hora, estado } = parseTimeToLocal(time);
        
        const deporte = categoriaMap[category?.toUpperCase()] || category || 'Deportes';
        
        const liga = info || 'N/A';
        
        let tituloLimpio = title
          .replace(/\[english\]/i, '(EN)')
          .replace(/\[spanish\]/i, '(ES)')
          .replace(/\[.*?\]/g, '')
          .trim();
        
        const equiposLogos = extraerEquiposYLogos(tituloLimpio);
        
        transmisiones.push({
          hora: hora,
          deporte: deporte,
          info: liga,
          liga: liga,
          titulo: tituloLimpio,
          evento: tituloLimpio,
          equipo1: equiposLogos.equipo1,
          equipo2: equiposLogos.equipo2,
          logo1: equiposLogos.logo1,
          logo2: equiposLogos.logo2,
          url: GLZ_PROXY + encodeURIComponent(url),
          urlOriginal: url,
          estado: estado
        });
      } catch (err) {
        console.error(`Error procesando evento ${index}:`, err.message);
      }
    });
    
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
      fuente: "supereventos2025.blogspot.com",
      fuenteJson: "locotv1993.github.io",
      deportes: deportes,
      deportesDisponibles: Object.keys(deportes),
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones2:", error.message);
    
    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "supereventos2025.blogspot.com",
      error: `Error obteniendo transmisiones: ${error.message}`,
      deportes: {},
      deportesDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones2 };

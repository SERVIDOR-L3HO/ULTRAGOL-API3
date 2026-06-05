const axios = require("axios");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

async function scrapTransmisiones4() {
  try {
    const url = "https://sportsonline.st/prog.txt";
    
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    const lines = response.data.split('\n');
    const transmisiones = [];
    let currentDay = "";
    
    // Formato esperado: "HH:MM   Equipo 1 x Equipo 2 | https://url"
    // O "HH:MM   Evento: Detalle | https://url"
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Detectar día
      if (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].includes(line.toUpperCase())) {
        currentDay = line;
        continue;
      }

      // Buscar patrón de evento con URL
      const match = line.match(/^(\d{2}:\d{2})\s+(.+?)\s*\|\s*(https?:\/\/\S+)/i);
      if (match) {
        const [_, hora, eventoFull, streamUrl] = match;
        
        // Limpiar evento
        let evento = eventoFull.trim();
        
        const equiposLogos = extraerEquiposYLogos(evento);
        
        transmisiones.push({
          evento: evento,
          equipo1: equiposLogos.equipo1,
          equipo2: equiposLogos.equipo2,
          pais: "Internacional",
          canales: [{
            nombre: "Opción 1",
            url: streamUrl
          }],
          totalCanales: 1,
          estado: "Programado"
        });
      }
    }

    console.log(`📺 Transmisiones4 (sportsonline.st) procesadas: ${transmisiones.length}`);
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "sportsonline.st",
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones4 (Sportsonline):", error.message);
    throw new Error(`No se pudieron obtener las transmisiones de sportsonline.st: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones4 };

const axios = require("axios");
const cheerio = require("cheerio");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

const GLZ_PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";

function decodificarBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (error) {
    return null;
  }
}

async function scrapTransmisiones4() {
  try {
    const url = "https://pelotaalibre.com/agenda.html";
    
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": "https://pelotaalibre.com/"
      },
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    const transmisiones = [];
    
    // El formato de pelotaalibre.com/agenda.html es una lista de partidos
    // Cada partido es un <li> que contiene el nombre del evento y luego los canales
    $("ul > li").each((i, el) => {
      const li = $(el);
      const textoEvento = li.find("a").first().text().trim();
      if (!textoEvento) return;

      // Extraer hora del texto (ej: "1:15pm")
      const horaMatch = textoEvento.match(/(\d{1,2}:\d{2}(?:am|pm))/i);
      const hora = horaMatch ? horaMatch[0] : "N/A";
      const evento = textoEvento.replace(hora, "").trim().replace(/\\$/, "").trim();

      const canales = [];
      li.find("ul li a").each((j, canalEl) => {
        const a = $(canalEl);
        const nombreCanal = a.text().trim().replace(/Calidad.*/, "").trim();
        const href = a.attr("href") || "";
        
        // Extraer Base64 del parámetro r=
        const base64Match = href.match(/[\?&]r=([A-Za-z0-9+/=]+)/);
        if (base64Match) {
          const urlDecodificada = decodificarBase64(base64Match[1]);
          if (urlDecodificada) {
            canales.push({
              nombre: nombreCanal,
              url: GLZ_PROXY + encodeURIComponent(urlDecodificada)
            });
          }
        }
      });

      if (canales.length > 0) {
        const equiposLogos = extraerEquiposYLogos(evento);
        
        transmisiones.push({
          hora: hora,
          fecha: new Date().toISOString().split('T')[0],
          evento: evento,
          equipo1: equiposLogos.equipo1,
          equipo2: equiposLogos.equipo2,
          logo1: equiposLogos.logo1,
          logo2: equiposLogos.logo2,
          pais: "Internacional",
          canales: canales,
          totalCanales: canales.length,
          estado: "En vivo" // Simplificado para Pelota Libre
        });
      }
    });

    console.log(`📺 Transmisiones4 (pelotaalibre.com) procesadas: ${transmisiones.length}`);
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "pelotaalibre.com",
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones4 (Pelota Libre):", error.message);
    throw new Error(`No se pudieron obtener las transmisiones de pelotaalibre.com: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones4 };

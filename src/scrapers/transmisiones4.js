const axios = require("axios");
const { extraerEquiposYLogos } = require("../utils/logoHelper");

function decodificarBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (error) {
    return null;
  }
}

function extraerEquiposDeDescripcion(descripcion) {
  if (!descripcion) return null;
  
  const lineas = descripcion.split('\n');
  if (lineas.length < 2) return descripcion.trim();
  
  return lineas[1].trim();
}

async function scrapTransmisiones4() {
  try {
    const url = "https://ftvhd.com/diaries.json";
    
    let response = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ];
        
        response = await axios.get(url, {
          headers: {
            "User-Agent": userAgents[attempt - 1],
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "DNT": "1",
            "Connection": "keep-alive"
          },
          timeout: 25000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        });
        
        if (response.status === 200) {
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
    
    if (!response || response.status !== 200) {
      throw lastError || new Error("No se pudo obtener el JSON después de 3 intentos");
    }
    
    const jsonData = response.data;
    const transmisiones = [];
    
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      throw new Error("Formato de datos inválido");
    }
    
    jsonData.data.forEach(item => {
      const attrs = item.attributes;
      if (!attrs) return;
      
      const hora = attrs.diary_hour || "N/A";
      const fecha = attrs.date_diary || "N/A";
      const descripcionCompleta = attrs.diary_description || "N/A";
      const evento = extraerEquiposDeDescripcion(descripcionCompleta);
      
      const pais = attrs.country?.data?.attributes?.name || "N/A";
      const banderaPais = attrs.country?.data?.attributes?.image?.data?.attributes?.url || null;
      
      const embeds = attrs.embeds?.data || [];
      
      if (embeds.length === 0) return;
      
      const canales = [];
      embeds.forEach(embed => {
        const embedAttrs = embed.attributes;
        if (!embedAttrs) return;
        
        const nombreCanal = embedAttrs.embed_name || "Canal desconocido";
        const embedIframe = embedAttrs.embed_iframe || "";
        
        if (embedIframe) {
          const base64Match = embedIframe.match(/\?r=([A-Za-z0-9+/=]+)/);
          if (base64Match) {
            const urlDecodificada = decodificarBase64(base64Match[1]);
            
            const urlCompleta = `https://ftvhd.com${embedIframe}`;
            const urlProxy = `https://golazotvhd.com/evento.html?get=${urlCompleta}`;
            
            canales.push({
              nombre: nombreCanal,
              urlOriginal: urlDecodificada,
              urlEmbed: urlCompleta,
              urlProxy: urlProxy
            });
          }
        }
      });
      
      if (canales.length === 0) return;
      
      const equiposLogos = extraerEquiposYLogos(evento);
      
      const fechaHora = new Date(`${fecha}T${hora}`);
      const ahora = new Date();
      const diferencia = fechaHora - ahora;
      
      let estado = "Programado";
      if (diferencia < 0 && diferencia > -10800000) {
        estado = "En vivo";
      } else if (diferencia > 0 && diferencia < 3600000) {
        estado = "Por comenzar";
      }
      
      transmisiones.push({
        hora: hora,
        fecha: fecha,
        fechaHora: `${fecha} ${hora}`,
        descripcion: descripcionCompleta,
        evento: evento,
        equipo1: equiposLogos.equipo1,
        equipo2: equiposLogos.equipo2,
        logo1: equiposLogos.logo1,
        logo2: equiposLogos.logo2,
        pais: pais,
        banderaPais: banderaPais ? `https://ftvhd.com${banderaPais}` : null,
        canales: canales,
        totalCanales: canales.length,
        estado: estado
      });
    });
    
    const paises = {};
    transmisiones.forEach(t => {
      if (!paises[t.pais]) {
        paises[t.pais] = 0;
      }
      paises[t.pais]++;
    });
    
    console.log(`📺 Transmisiones4 (ftvhd.com) procesadas: ${transmisiones.length}`);
    console.log(`🌎 Países disponibles: ${Object.keys(paises).join(", ")}`);
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "ftvhd.com",
      paises: paises,
      paisesDisponibles: Object.keys(paises),
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones4:", error.message);
    
    if (error.message.includes("403") || error.message.includes("Acceso bloqueado")) {
      console.log("⚠️ El sitio ftvhd.com está bloqueando las peticiones desde este servidor");
      
      return {
        total: 0,
        actualizado: new Date().toISOString(),
        fuente: "ftvhd.com",
        error: "Acceso bloqueado por el sitio web. El sitio está bloqueando peticiones desde servidores de hosting.",
        sugerencia: "Los datos se cachean por 30 minutos cuando están disponibles.",
        paises: {},
        paisesDisponibles: [],
        transmisiones: []
      };
    }
    
    throw new Error(`No se pudieron obtener las transmisiones de ftvhd.com: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones4 };

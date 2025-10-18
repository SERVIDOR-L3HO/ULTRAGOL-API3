const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

async function scrapTransmisiones() {
  try {
    const url = "https://rereyano.ru/";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const transmisiones = [];
    const textoCompleto = $("textarea").first().text();
    const lineas = textoCompleto.split("\n");
    
    const lineaRegex = /^(\d{2}-\d{2}-\d{4})\s*\((\d{2}:\d{2})\)\s+(.+?)(\s+\(CH.+)?$/;
    
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      
      if (linea.includes("----")) continue;
      if (linea.includes("⚠️") || linea.includes("🚨")) continue;
      if (linea.includes("Cartel :") || linea.includes("hoca :")) continue;
      if (linea.includes("partnership")) continue;
      
      const match = linea.match(lineaRegex);
      
      if (match) {
        const fecha = match[1];
        const hora = match[2];
        let eventoCompleto = match[3].trim();
        
        const canales = [];
        const canalesRegex = /\(CH([\d\w]+)\)/g;
        let matchCanal;
        
        while ((matchCanal = canalesRegex.exec(linea)) !== null) {
          canales.push(matchCanal[1]);
        }
        
        const evento = eventoCompleto.replace(/\(CH[\d\w]+\)/g, "").trim();
        
        if (evento && fecha && hora) {
          transmisiones.push({
            fecha: fecha,
            hora: hora,
            fechaHora: `${fecha} ${hora}`,
            evento: evento,
            canales: canales,
            totalCanales: canales.length
          });
        }
      }
    }
    
    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "rereyano.ru",
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones };

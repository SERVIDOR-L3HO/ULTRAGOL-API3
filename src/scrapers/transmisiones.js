const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");
const { scrapCalendario } = require("./calendario");

function normalizarNombreEquipo(nombre) {
  const normalizaciones = {
    "america": ["américa", "america", "club américa"],
    "cruz azul": ["cruz azul", "cruzazul"],
    "chivas": ["chivas", "guadalajara", "chivas guadalajara"],
    "pumas": ["pumas", "pumas unam", "unam"],
    "tigres": ["tigres", "tigres uanl"],
    "monterrey": ["monterrey", "rayados"],
    "leon": ["león", "leon", "club león"],
    "santos": ["santos", "santos laguna"],
    "toluca": ["toluca", "diablos rojos"],
    "atlas": ["atlas"],
    "pachuca": ["pachuca", "tuzos"],
    "queretaro": ["querétaro", "queretaro", "gallos blancos"],
    "puebla": ["puebla", "la franja"],
    "necaxa": ["necaxa", "rayos"],
    "tijuana": ["tijuana", "xolos"],
    "juarez": ["juárez", "juarez", "fc juárez"],
    "mazatlan": ["mazatlán", "mazatlan"],
    "san luis": ["atlético san luis", "atletico san luis", "san luis"]
  };
  
  const nombreLower = nombre.toLowerCase().trim();
  
  for (const [key, variantes] of Object.entries(normalizaciones)) {
    if (variantes.some(v => nombreLower.includes(v) || v.includes(nombreLower))) {
      return key;
    }
  }
  
  return nombreLower;
}

function buscarPartidoEnCalendario(evento, calendario) {
  const eventoLower = evento.toLowerCase();
  const separadores = [' vs ', ' vs. ', ' - ', ' x '];
  
  let equipos = null;
  for (const sep of separadores) {
    if (eventoLower.includes(sep)) {
      equipos = eventoLower.split(sep).map(e => e.trim());
      break;
    }
  }
  
  if (!equipos || equipos.length !== 2) {
    return null;
  }
  
  const equipo1Normalizado = normalizarNombreEquipo(equipos[0]);
  const equipo2Normalizado = normalizarNombreEquipo(equipos[1]);
  
  const partidosProximos = calendario.calendario.filter(p => p.estado === "Programado");
  
  for (const partido of partidosProximos) {
    const localNormalizado = normalizarNombreEquipo(partido.equipoLocal.nombre);
    const visitanteNormalizado = normalizarNombreEquipo(partido.equipoVisitante.nombre);
    
    if ((equipo1Normalizado === localNormalizado && equipo2Normalizado === visitanteNormalizado) ||
        (equipo1Normalizado === visitanteNormalizado && equipo2Normalizado === localNormalizado)) {
      return partido;
    }
  }
  
  return null;
}

function formatearFecha(fechaISO) {
  // Extraer fecha directamente del ISO (ya está en la fecha correcta)
  const fechaParte = fechaISO.substring(0, 10);
  const [año, mes, dia] = fechaParte.split('-');
  return `${dia}-${mes}-${año}`;
}

function formatearHora(fechaISO) {
  const fecha = new Date(fechaISO);
  //  Extraer hora y minutos directamente del ISO (ya está en la hora correcta)
  const horaMinutos = fechaISO.substring(11, 16);
  return horaMinutos;
}

async function scrapTransmisiones() {
  try {
    const url = "https://rereyano.ru/";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const transmisiones = [];
    const textoCompleto = $("textarea").first().text();
    const lineas = textoCompleto.split("\n");
    
    const lineaRegex = /^(\d{2}-\d{2}-\d{4})\s*\((\d{2}:\d{2})\)\s+(.+?)(\s+\(CH.+)?$/;
    
    console.log("📅 Obteniendo calendario para corregir fechas...");
    let calendario = null;
    try {
      calendario = await scrapCalendario();
      console.log(`✅ Calendario obtenido: ${calendario.total} partidos`);
    } catch (error) {
      console.error("⚠️ No se pudo obtener el calendario, usando fechas originales:", error.message);
    }
    
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      
      if (linea.includes("----")) continue;
      if (linea.includes("⚠️") || linea.includes("🚨")) continue;
      if (linea.includes("Cartel :") || linea.includes("hoca :")) continue;
      if (linea.includes("partnership")) continue;
      
      const match = linea.match(lineaRegex);
      
      if (match) {
        let fecha = match[1];
        let hora = match[2];
        let eventoCompleto = match[3].trim();
        
        const canales = [];
        const canalesRegex = /\(CH([\d\w]+)\)/g;
        let matchCanal;
        
        while ((matchCanal = canalesRegex.exec(linea)) !== null) {
          canales.push(matchCanal[1]);
        }
        
        const evento = eventoCompleto.replace(/\(CH[\d\w]+\)/g, "").trim();
        
        let fechaCorregida = false;
        if (calendario && evento) {
          const partidoEncontrado = buscarPartidoEnCalendario(evento, calendario);
          if (partidoEncontrado) {
            fecha = formatearFecha(partidoEncontrado.fechaISO);
            hora = formatearHora(partidoEncontrado.fechaISO);
            fechaCorregida = true;
            console.log(`✅ Fecha corregida para: ${evento} -> ${fecha} ${hora}`);
          }
        }
        
        if (evento && fecha && hora) {
          transmisiones.push({
            fecha: fecha,
            hora: hora,
            fechaHora: `${fecha} ${hora}`,
            evento: evento,
            canales: canales,
            totalCanales: canales.length,
            fechaCorregida: fechaCorregida
          });
        }
      }
    }
    
    const corregidas = transmisiones.filter(t => t.fechaCorregida).length;
    console.log(`📊 Transmisiones procesadas: ${transmisiones.length}, Fechas corregidas: ${corregidas}`);
    
    return {
      total: transmisiones.length,
      fechasCorregidas: corregidas,
      actualizado: new Date().toISOString(),
      fuente: "rereyano.ru",
      calendario: calendario ? "ESPN" : "No disponible",
      transmisiones: transmisiones
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones };

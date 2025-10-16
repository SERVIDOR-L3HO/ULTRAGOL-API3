const cheerio = require("cheerio");
const { fetchWithRetry } = require("../../utils/scraper");

function calcularContador(fechaPartido) {
  const ahora = new Date();
  const partido = new Date(fechaPartido);
  const diferencia = partido - ahora;

  if (diferencia < 0) {
    return {
      dias: 0,
      horas: 0,
      minutos: 0,
      segundos: 0,
      mensaje: "Partita in corso o terminata"
    };
  }

  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

  return {
    dias,
    horas,
    minutos,
    segundos,
    mensaje: `${dias}g ${horas}h ${minutos}m ${segundos}s`
  };
}

async function scrapCalendarioSerieA() {
  try {
    const url = "https://www.espn.com/soccer/schedule/_/league/ita.1";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const calendario = [];
    let fechaActual = "";
    let jornada = 1;
    
    $(".ScheduleTables").children().each((index, element) => {
      if ($(element).hasClass("Table__Title")) {
        fechaActual = $(element).text().trim();
        
        const jornadaMatch = fechaActual.match(/Matchweek (\d+)/i);
        if (jornadaMatch) {
          jornada = parseInt(jornadaMatch[1]);
        }
      } else if ($(element).hasClass("ResponsiveTable") || $(element).hasClass("Table")) {
        $(element).find("tbody tr").each((i, row) => {
          const equipoLocal = $(row).find("td").eq(0).find(".Table__Team a").last().text().trim();
          const equipoVisitante = $(row).find("td").eq(1).find(".Table__Team a").last().text().trim();
          const horaTexto = $(row).find("td").eq(2).text().trim();
          
          if (equipoLocal && equipoVisitante && horaTexto) {
            let fechaPartido = parseFechaHora(fechaActual, horaTexto, "Europe/Rome");
            const contador = calcularContador(fechaPartido);
            
            calendario.push({
              jornada: jornada,
              equipoLocal,
              equipoVisitante,
              fecha: fechaActual || "Da confermare",
              hora: horaTexto,
              fechaCompleta: fechaPartido.toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
              contador: contador
            });
          }
        });
      }
    });

    return {
      actualizado: new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
      total: calendario.length,
      calendario: calendario
    };
  } catch (error) {
    console.error("Error scraping Serie A fixtures:", error.message);
    throw error;
  }
}

function parseFechaHora(fechaTexto, horaTexto, timezone) {
  try {
    let fechaPartido;
    
    if (fechaTexto && (horaTexto.includes("PM") || horaTexto.includes("AM"))) {
      const fechaCompleta = `${fechaTexto} ${horaTexto}`;
      fechaPartido = new Date(fechaCompleta);
    } else if (horaTexto.includes("PM") || horaTexto.includes("AM")) {
      const ahora = new Date();
      const hora24 = convertirHora12a24(horaTexto);
      fechaPartido = new Date(ahora);
      fechaPartido.setHours(parseInt(hora24.split(":")[0]));
      fechaPartido.setMinutes(parseInt(hora24.split(":")[1]));
      fechaPartido.setSeconds(0);
    } else {
      fechaPartido = new Date(`${fechaTexto} ${horaTexto}`);
    }
    
    if (isNaN(fechaPartido.getTime())) {
      fechaPartido = new Date();
    }
    
    return fechaPartido;
  } catch (error) {
    return new Date();
  }
}

function convertirHora12a24(hora12) {
  const match = hora12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "00:00";
  
  let horas = parseInt(match[1]);
  const minutos = match[2];
  const periodo = match[3].toUpperCase();
  
  if (periodo === "PM" && horas !== 12) {
    horas += 12;
  } else if (periodo === "AM" && horas === 12) {
    horas = 0;
  }
  
  return `${horas.toString().padStart(2, '0')}:${minutos}`;
}

module.exports = { scrapCalendarioSerieA };

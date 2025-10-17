const cheerio = require("cheerio");
const { fetchWithRetry } = require("../utils/scraper");

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
      mensaje: "Partido en curso o finalizado"
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
    mensaje: `${dias}d ${horas}h ${minutos}m ${segundos}s`
  };
}

async function scrapCalendarioCompleto(url, timezone = "America/Mexico_City") {
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);
  
  const partidos = [];
  let fechaActual = "";
  let jornada = 1;
  
  $(".ScheduleTables").children().each((index, element) => {
    if ($(element).hasClass("Table__Title")) {
      fechaActual = $(element).text().trim();
      
      const jornadaMatch = fechaActual.match(/Jornada (\d+)/i);
      if (jornadaMatch) {
        jornada = parseInt(jornadaMatch[1]);
      }
    } else if ($(element).hasClass("ResponsiveTable") || $(element).hasClass("Table")) {
      $(element).find("tbody tr").each((i, row) => {
        const tds = $(row).find("td");
        
        const equipoLocal = tds.eq(0).find(".Table__Team a").last().text().trim();
        const escudoLocal = tds.eq(0).find("img").attr("data-default-src") || tds.eq(0).find("img").attr("src");
        const enlaceLocal = tds.eq(0).find("a").last().attr("href");
        
        const equipoVisitante = tds.eq(1).find(".Table__Team a").last().text().trim();
        const escudoVisitante = tds.eq(1).find("img").attr("data-default-src") || tds.eq(1).find("img").attr("src");
        const enlaceVisitante = tds.eq(1).find("a").last().attr("href");
        const enlacePartido = tds.eq(1).find("a").first().attr("href");
        
        const textoHoraColumna = tds.eq(2).text().trim();
        let horaTexto = textoHoraColumna;
        let resultado = null;
        let estado = "Programado";
        
        const resultadoMatch = textoHoraColumna.match(/(\d+)\s*-\s*(\d+)/);
        if (resultadoMatch) {
          resultado = {
            local: parseInt(resultadoMatch[1]),
            visitante: parseInt(resultadoMatch[2]),
            ganador: parseInt(resultadoMatch[1]) > parseInt(resultadoMatch[2]) ? 'local' : 
                     parseInt(resultadoMatch[2]) > parseInt(resultadoMatch[1]) ? 'visitante' : 'empate'
          };
          estado = "Finalizado";
          horaTexto = tds.eq(2).find(".Schedule__Time").text().trim() || textoHoraColumna;
        }
        
        const canalesTV = tds.eq(3).text().trim();
        const estadio = tds.eq(4).text().trim();
        
        const odds = tds.eq(6).text().trim();
        let apuestas = null;
        if (odds) {
          const oddsMatch = odds.match(/([A-Z]+):\s*([\+\-]\d+).*?([A-Z]+):\s*([\+\-]\d+)/);
          if (oddsMatch) {
            apuestas = {
              local: { equipo: oddsMatch[1], valor: oddsMatch[2] },
              visitante: { equipo: oddsMatch[3], valor: oddsMatch[4] }
            };
          }
        }
        
        if (equipoLocal && equipoVisitante && (horaTexto || resultado)) {
          let fechaPartido = parseFechaHora(fechaActual, horaTexto, timezone);
          const contador = calcularContador(fechaPartido);
          
          const partido = {
            jornada: jornada,
            equipoLocal: {
              nombre: equipoLocal,
              escudo: escudoLocal || null,
              enlace: enlaceLocal ? `https://www.espn.com.mx${enlaceLocal}` : null
            },
            equipoVisitante: {
              nombre: equipoVisitante,
              escudo: escudoVisitante || null,
              enlace: enlaceVisitante ? `https://www.espn.com.mx${enlaceVisitante}` : null
            },
            fecha: fechaActual || "Por confirmar",
            hora: horaTexto,
            fechaCompleta: fechaPartido.toLocaleString("es-MX", { 
              timeZone: timezone,
              dateStyle: "full",
              timeStyle: "short"
            }),
            fechaISO: fechaPartido.toISOString(),
            contador: contador,
            estado: estado,
            resultado: resultado,
            estadio: estadio || "Por confirmar",
            canalesTV: canalesTV || "No disponible",
            apuestas: apuestas,
            enlacePartido: enlacePartido ? `https://www.espn.com.mx${enlacePartido}` : null
          };
          
          partidos.push(partido);
        }
      });
    }
  });
  
  return partidos;
}

async function scrapCalendario() {
  try {
    const urlFuturos = "https://www.espn.com.mx/futbol/calendario/_/liga/mex.1";
    const urlPasados = "https://www.espn.com.mx/futbol/resultados/_/liga/mex.1";
    
    const partidosFuturos = await scrapCalendarioCompleto(urlFuturos, "America/Mexico_City");
    const partidosPasados = await scrapCalendarioCompleto(urlPasados, "America/Mexico_City");
    
    const todosLosPartidos = [...partidosPasados, ...partidosFuturos];
    
    todosLosPartidos.sort((a, b) => {
      if (a.jornada !== b.jornada) return a.jornada - b.jornada;
      return new Date(a.fechaISO) - new Date(b.fechaISO);
    });

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: todosLosPartidos.length,
      jornadasTotales: 17,
      liga: "Liga MX",
      pais: "México",
      calendario: todosLosPartidos
    };
  } catch (error) {
    console.error("Error scraping calendario:", error.message);
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

module.exports = { scrapCalendario };

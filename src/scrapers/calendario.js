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

async function scrapCalendario() {
  try {
    const url = "https://www.mediotiempo.com/futbol/liga-mx/calendario";
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    const partidos = [];
    
    $("table tbody tr").each((i, row) => {
      try {
        const cells = $(row).find("td");
        if (cells.length < 2) return;
        
        const fechaHoraText = $(cells[0]).text().trim();
        const partidoCell = $(cells[1]);
        
        const equipoLocalElement = $(partidoCell).find("img").first();
        const equipoVisitanteElement = $(partidoCell).find("img").last();
        
        const equipoLocal = equipoLocalElement.attr("alt") || "";
        const escudoLocal = equipoLocalElement.attr("src") || null;
        
        const equipoVisitante = equipoVisitanteElement.attr("alt") || "";
        const escudoVisitante = equipoVisitanteElement.attr("src") || null;
        
        const enlacePartido = $(partidoCell).find("a").attr("href") || null;
        const estatusText = $(cells[2]).text().trim();
        
        if (!equipoLocal || !equipoVisitante || !fechaHoraText) return;
        
        const fechaHoraParts = fechaHoraText.split(/\s+/);
        if (fechaHoraParts.length < 3) return;
        
        const dia = fechaHoraParts[0];
        const mesAbreviado = fechaHoraParts[1].replace('.', '');
        const hora24 = fechaHoraParts[2];
        
        const meses = {
          'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3,
          'may': 4, 'jun': 5, 'jul': 6, 'ago': 7,
          'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
        };
        
        const mes = meses[mesAbreviado.toLowerCase()];
        if (mes === undefined) return;
        
        const ahora = new Date();
        const año = ahora.getFullYear();
        
        const [horas, minutos] = hora24.split(':').map(n => parseInt(n));
        const fechaPartido = new Date(año, mes, parseInt(dia), horas, minutos, 0);
        
        const contador = calcularContador(fechaPartido);
        
        let estado = "Programado";
        let resultado = null;
        
        if (estatusText && estatusText.match(/\d+\s*-\s*\d+/)) {
          estado = "Finalizado";
          const resultadoMatch = estatusText.match(/(\d+)\s*-\s*\d+/);
          if (resultadoMatch) {
            const [golesLocal, golesVisitante] = estatusText.split('-').map(g => parseInt(g.trim()));
            resultado = {
              local: golesLocal,
              visitante: golesVisitante,
              ganador: golesLocal > golesVisitante ? 'local' : 
                       golesVisitante > golesLocal ? 'visitante' : 'empate'
            };
          }
        }
        
        const partido = {
          jornada: null,
          equipoLocal: {
            nombre: equipoLocal,
            escudo: escudoLocal,
            enlace: null
          },
          equipoVisitante: {
            nombre: equipoVisitante,
            escudo: escudoVisitante,
            enlace: null
          },
          fecha: `${dia} de ${Object.keys(meses).find(key => meses[key] === mes)}`,
          hora: hora24,
          fechaCompleta: fechaPartido.toLocaleString("es-MX", { 
            timeZone: "America/Mexico_City",
            dateStyle: "full",
            timeStyle: "short"
          }),
          fechaISO: fechaPartido.toISOString(),
          contador: contador,
          estado: estado,
          resultado: resultado,
          estadio: "Por confirmar",
          canalesTV: "Por confirmar",
          apuestas: null,
          enlacePartido: enlacePartido ? `https://www.mediotiempo.com${enlacePartido}` : null
        };
        
        partidos.push(partido);
      } catch (error) {
        console.error(`Error procesando partido en fila ${i}:`, error.message);
      }
    });

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: partidos.length,
      jornadasTotales: 17,
      liga: "Liga MX",
      pais: "México",
      fuente: "Mediotiempo",
      calendario: partidos
    };
  } catch (error) {
    console.error("Error scraping calendario:", error.message);
    throw error;
  }
}

module.exports = { scrapCalendario };

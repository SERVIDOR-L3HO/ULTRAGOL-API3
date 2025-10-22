const axios = require("axios");

/**
 * Scraper genérico para obtener marcadores en tiempo real desde ESPN API
 * @param {string} leagueCode - Código de la liga (ej: 'mex.1', 'eng.1', etc.)
 * @param {string} leagueName - Nombre de la liga para el resultado
 * @param {string} date - Fecha opcional en formato YYYYMMDD
 * @returns {Promise<Object>} Datos de marcadores en tiempo real
 */
async function scrapMarcadores(leagueCode, leagueName, date = null) {
  try {
    const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard`;
    const params = {};
    
    if (date) {
      params.dates = date;
    }

    console.log(`⚽ Obteniendo marcadores de ${leagueName} desde ESPN API...`);
    
    const response = await axios.get(baseUrl, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data;
    
    // Procesar los eventos (partidos)
    const partidos = (data.events || []).map(event => {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      // Identificar equipo local y visitante
      const homeTeam = competitors.find(c => c.homeAway === 'home') || competitors[0];
      const awayTeam = competitors.find(c => c.homeAway === 'away') || competitors[1];
      
      // Estado del partido
      const status = event.status;
      const statusType = status.type.name; // 'STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_FINAL'
      
      // Extraer goles y eventos del partido (en tiempo real)
      const goles = (competition.details || [])
        .filter(detail => detail.scoringPlay === true)
        .map(gol => ({
          minuto: gol.clock?.displayValue || gol.clock?.value || 'N/A',
          goleador: gol.athletesInvolved?.[0]?.displayName || 'Desconocido',
          jugadorId: gol.athletesInvolved?.[0]?.id || null,
          equipoId: gol.team?.id || null,
          equipo: gol.team?.displayName || 
                  (gol.team?.id === homeTeam.team.id ? homeTeam.team.displayName : 
                   gol.team?.id === awayTeam.team.id ? awayTeam.team.displayName : 'Desconocido'),
          descripcion: gol.text || '',
          tipoGol: gol.type?.text || 'Gol'
        }));
      
      // Separar goles por equipo
      const golesLocal = goles.filter(g => g.equipoId === homeTeam.team.id);
      const golesVisitante = goles.filter(g => g.equipoId === awayTeam.team.id);
      
      return {
        id: event.id,
        fecha: new Date(event.date).toLocaleString('es-MX', { 
          timeZone: 'America/Mexico_City',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        fechaISO: event.date,
        estado: {
          tipo: statusType,
          descripcion: status.type.description,
          completado: status.type.completed,
          enVivo: statusType === 'STATUS_IN_PROGRESS',
          finalizado: statusType === 'STATUS_FINAL',
          programado: statusType === 'STATUS_SCHEDULED'
        },
        periodo: status.period || 0,
        reloj: status.displayClock || '0:00',
        local: {
          id: homeTeam.team.id,
          nombre: homeTeam.team.displayName,
          nombreCorto: homeTeam.team.abbreviation,
          logo: homeTeam.team.logo || null,
          marcador: homeTeam.score || '0',
          ganador: homeTeam.winner || false,
          goles: golesLocal
        },
        visitante: {
          id: awayTeam.team.id,
          nombre: awayTeam.team.displayName,
          nombreCorto: awayTeam.team.abbreviation,
          logo: awayTeam.team.logo || null,
          marcador: awayTeam.score || '0',
          ganador: awayTeam.winner || false,
          goles: golesVisitante
        },
        goles: goles,
        detalles: {
          nombrePartido: event.name,
          nombreCorto: event.shortName,
          estadio: competition.venue?.fullName || null,
          ciudad: competition.venue?.address?.city || null,
          transmisiones: (competition.broadcasts || []).map(b => ({
            canal: b.market,
            nombres: b.names
          }))
        }
      };
    });

    return {
      actualizado: new Date().toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City' 
      }),
      liga: leagueName,
      temporada: data.season?.year || null,
      jornada: data.season?.type || null,
      total: partidos.length,
      partidos: partidos
    };

  } catch (error) {
    console.error(`❌ Error obteniendo marcadores de ${leagueName}:`, error.message);
    throw new Error(`No se pudieron obtener los marcadores de ${leagueName}: ${error.message}`);
  }
}

// Funciones específicas para cada liga
async function scrapMarcadoresLigaMX(date = null) {
  return await scrapMarcadores('mex.1', 'Liga MX', date);
}

async function scrapMarcadoresPremier(date = null) {
  return await scrapMarcadores('eng.1', 'Premier League', date);
}

async function scrapMarcadoresLaLiga(date = null) {
  return await scrapMarcadores('esp.1', 'La Liga', date);
}

async function scrapMarcadoresSerieA(date = null) {
  return await scrapMarcadores('ita.1', 'Serie A', date);
}

async function scrapMarcadoresBundesliga(date = null) {
  return await scrapMarcadores('ger.1', 'Bundesliga', date);
}

async function scrapMarcadoresLigue1(date = null) {
  return await scrapMarcadores('fra.1', 'Ligue 1', date);
}

module.exports = {
  scrapMarcadores,
  scrapMarcadoresLigaMX,
  scrapMarcadoresPremier,
  scrapMarcadoresLaLiga,
  scrapMarcadoresSerieA,
  scrapMarcadoresBundesliga,
  scrapMarcadoresLigue1
};

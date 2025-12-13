const axios = require("axios");
const cheerio = require("cheerio");

const photoCache = new Map();
const photoStats = {
  totalRequests: 0,
  cacheHits: 0,
  espnProvided: 0,
  theSportsDbSuccess: 0,
  theSportsDbFail: 0,
  placeholderUsed: 0
};

function getPhotoStats() {
  return {
    ...photoStats,
    cacheHitRate: photoStats.totalRequests > 0 
      ? ((photoStats.cacheHits / photoStats.totalRequests) * 100).toFixed(2) + '%'
      : '0%',
    enrichmentRate: photoStats.totalRequests > 0
      ? ((photoStats.theSportsDbSuccess / (photoStats.totalRequests - photoStats.espnProvided - photoStats.cacheHits)) * 100).toFixed(2) + '%'
      : '0%'
  };
}

function clearPhotoCache() {
  const size = photoCache.size;
  photoCache.clear();
  console.log(`🧹 Caché de fotos limpiado (${size} entradas)`);
}

/**
 * Obtener alineaciones desde ESPN API (fuente principal)
 * @param {string} eventId - ID del evento/partido
 * @returns {Promise<Object>} Datos de alineaciones
 */
async function getLineupFromESPN(eventId) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${eventId}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data;
    
    // Verificar si hay alineaciones disponibles en rosters
    if (!data.rosters || data.rosters.length === 0) {
      return null;
    }

    const rosters = data.rosters;
    const gameInfo = data.gameInfo || {};
    const header = data.header || {};
    const competition = header.competitions?.[0] || {};
    
    const lineups = await Promise.all(rosters.map(async (rosterData) => {
      const team = rosterData.team || {};
      const players = rosterData.roster || [];
      const formation = rosterData.formation || 'N/A';
      
      const titulares = [];
      const suplentes = [];
      let entrenador = null;
      
      for (const playerData of players) {
        const athlete = playerData.athlete || {};
        let photoUrl = athlete.headshot?.href || athlete.headshot || null;
        
        if (photoUrl) {
          photoStats.totalRequests++;
          photoStats.espnProvided++;
        } else if (athlete.displayName) {
          photoUrl = await getPlayerPhoto(athlete.displayName, team.displayName);
        }
        
        const player = {
          id: athlete.id || null,
          nombre: athlete.displayName || athlete.fullName || 'Desconocido',
          nombreCorto: athlete.shortName || '',
          numero: playerData.jersey || '',
          posicion: athlete.position?.abbreviation || athlete.position?.name || 'N/A',
          posicionCompleta: athlete.position?.displayName || '',
          foto: photoUrl,
          titular: playerData.starter === true,
          capitan: playerData.captain === true,
          estadisticas: []
        };
        
        if (player.titular) {
          titulares.push(player);
        } else {
          suplentes.push(player);
        }
      }
      
      return {
        equipo: {
          id: team.id,
          nombre: team.displayName,
          nombreCorto: team.abbreviation,
          logo: team.logo || team.logos?.[0]?.href || null,
          color: team.color || null,
          colorAlterno: team.alternateColor || null
        },
        formacion: formation,
        titulares: titulares,
        suplentes: suplentes,
        entrenador: entrenador,
        totalJugadores: titulares.length + suplentes.length,
        alineacionConfirmada: titulares.length >= 11
      };
    }));
    
    return {
      eventoId: eventId,
      partido: {
        nombre: header.competitions?.[0]?.competitors?.map(c => c.team?.displayName).join(' vs ') || 'Partido',
        fecha: header.competitions?.[0]?.date || null,
        estadio: competition.venue?.fullName || null,
        ciudad: competition.venue?.address?.city || null,
        estado: header.competitions?.[0]?.status?.type?.description || 'Programado'
      },
      alineaciones: lineups,
      fuente: 'ESPN',
      actualizado: new Date().toISOString(),
      alineacionesDisponibles: lineups.every(l => l.alineacionConfirmada)
    };
    
  } catch (error) {
    console.error(`Error obteniendo alineación de ESPN para evento ${eventId}:`, error.message);
    return null;
  }
}

/**
 * Scraping de alineaciones desde Flashscore (fuente alternativa)
 * @param {string} matchUrl - URL del partido en Flashscore
 * @returns {Promise<Object>} Datos de alineaciones
 */
async function getLineupFromFlashscore(matchUrl) {
  try {
    const response = await axios.get(matchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Flashscore carga datos dinámicamente, intentar obtener lo que podamos
    const lineups = [];
    
    // Esta es una implementación básica - Flashscore usa JavaScript para cargar alineaciones
    // Se necesitaría un navegador headless para obtener datos completos
    
    return {
      alineaciones: lineups,
      fuente: 'Flashscore',
      alineacionesDisponibles: false
    };
    
  } catch (error) {
    console.error(`Error scraping Flashscore:`, error.message);
    return null;
  }
}

/**
 * Obtener fotos de jugadores desde múltiples fuentes con memoización
 * @param {string} playerName - Nombre del jugador
 * @param {string} teamName - Nombre del equipo
 * @returns {Promise<string|null>} URL de la foto
 */
async function getPlayerPhoto(playerName, teamName) {
  photoStats.totalRequests++;
  
  const cacheKey = `${playerName.toLowerCase().trim()}_${teamName.toLowerCase().trim()}`;
  
  if (photoCache.has(cacheKey)) {
    photoStats.cacheHits++;
    return photoCache.get(cacheKey);
  }
  
  try {
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`;
    const response = await axios.get(searchUrl, { timeout: 3000 });
    
    if (response.data && response.data.player && response.data.player.length > 0) {
      const player = response.data.player.find(p => 
        p.strPlayer.toLowerCase().includes(playerName.split(' ')[0].toLowerCase())
      ) || response.data.player[0];
      
      if (player && (player.strCutout || player.strThumb)) {
        const photoUrl = player.strCutout || player.strThumb;
        photoCache.set(cacheKey, photoUrl);
        photoStats.theSportsDbSuccess++;
        console.log(`✅ Foto encontrada para ${playerName} en TheSportsDB`);
        return photoUrl;
      }
    }
    
    photoStats.theSportsDbFail++;
    console.log(`⚠️  Foto no encontrada para ${playerName} en TheSportsDB, usando placeholder`);
  } catch (error) {
    photoStats.theSportsDbFail++;
    console.log(`❌ Error buscando foto para ${playerName}: ${error.message}`);
  }
  
  const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&size=200&background=random&bold=true`;
  photoCache.set(cacheKey, placeholderUrl);
  photoStats.placeholderUsed++;
  
  return placeholderUrl;
}

/**
 * Scraper genérico de alineaciones con sistema multi-fuente
 * @param {string} leagueCode - Código de la liga ESPN
 * @param {string} leagueName - Nombre de la liga
 * @param {string} date - Fecha opcional YYYYMMDD
 * @returns {Promise<Object>} Alineaciones de todos los partidos
 */
async function scrapAlineaciones(leagueCode, leagueName, date = null) {
  try {
    console.log(`⚽ Obteniendo alineaciones de ${leagueName}...`);
    
    // Primero obtener los partidos del día
    const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard`;
    const params = {};
    
    if (date) {
      params.dates = date;
    }
    
    const response = await axios.get(baseUrl, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    const events = response.data.events || [];
    
    if (events.length === 0) {
      return {
        liga: leagueName,
        fecha: date || new Date().toISOString().split('T')[0],
        totalPartidos: 0,
        partidos: [],
        mensaje: 'No hay partidos programados para esta fecha'
      };
    }
    
    // Obtener alineaciones de cada partido
    const partidosConAlineaciones = await Promise.all(
      events.map(async (event) => {
        const eventId = event.id;
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        const homeTeam = competitors.find(c => c.homeAway === 'home') || competitors[0];
        const awayTeam = competitors.find(c => c.homeAway === 'away') || competitors[1];
        
        // Intentar obtener alineación de ESPN
        let alineacionData = await getLineupFromESPN(eventId);
        
        // Si no hay alineación confirmada, crear estructura placeholder
        if (!alineacionData || !alineacionData.alineacionesDisponibles) {
          return {
            eventoId: eventId,
            partido: {
              nombre: `${homeTeam.team.displayName} vs ${awayTeam.team.displayName}`,
              fecha: event.date,
              hora: new Date(event.date).toLocaleTimeString('es-MX', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Mexico_City'
              }),
              estadio: competition.venue?.fullName || null,
              estado: event.status?.type?.description || 'Programado',
              horasParaInicio: Math.round((new Date(event.date) - new Date()) / (1000 * 60 * 60))
            },
            local: {
              equipo: {
                id: homeTeam.team.id,
                nombre: homeTeam.team.displayName,
                nombreCorto: homeTeam.team.abbreviation,
                logo: homeTeam.team.logo
              }
            },
            visitante: {
              equipo: {
                id: awayTeam.team.id,
                nombre: awayTeam.team.displayName,
                nombreCorto: awayTeam.team.abbreviation,
                logo: awayTeam.team.logo
              }
            },
            alineacionDisponible: false,
            mensaje: 'Alineación aún no disponible. Se publicará aproximadamente 1 hora antes del partido.',
            proximaActualizacion: 'Cada 15 minutos',
            fuente: alineacionData ? alineacionData.fuente : 'Pendiente'
          };
        }
        
        // Retornar alineaciones completas
        return {
          eventoId: eventId,
          partido: alineacionData.partido,
          local: alineacionData.alineaciones[0],
          visitante: alineacionData.alineaciones[1],
          alineacionDisponible: true,
          fuente: alineacionData.fuente,
          actualizado: alineacionData.actualizado
        };
      })
    );
    
    const disponibles = partidosConAlineaciones.filter(p => p.alineacionDisponible).length;
    const pendientes = partidosConAlineaciones.length - disponibles;
    
    return {
      liga: leagueName,
      fecha: date || new Date().toISOString().split('T')[0],
      actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      totalPartidos: partidosConAlineaciones.length,
      alineacionesDisponibles: disponibles,
      alineacionesPendientes: pendientes,
      partidos: partidosConAlineaciones,
      nota: 'Las alineaciones se actualizan automáticamente. Generalmente se publican 1 hora antes del inicio del partido.'
    };
    
  } catch (error) {
    console.error(`❌ Error obteniendo alineaciones de ${leagueName}:`, error.message);
    throw new Error(`No se pudieron obtener las alineaciones de ${leagueName}: ${error.message}`);
  }
}

/**
 * Obtener alineación de un partido específico por ID
 * @param {string} eventId - ID del evento
 * @returns {Promise<Object>} Alineación del partido
 */
async function scrapAlineacionPartido(eventId) {
  try {
    console.log(`⚽ Obteniendo alineación del partido ${eventId}...`);
    
    const alineacionData = await getLineupFromESPN(eventId);
    
    if (!alineacionData) {
      return {
        eventoId: eventId,
        error: true,
        mensaje: 'No se pudo obtener la alineación. Puede que aún no esté disponible.',
        sugerencia: 'Las alineaciones suelen publicarse 1 hora antes del partido.'
      };
    }
    
    return alineacionData;
    
  } catch (error) {
    console.error(`❌ Error obteniendo alineación del partido ${eventId}:`, error.message);
    throw new Error(`No se pudo obtener la alineación del partido: ${error.message}`);
  }
}

// Funciones específicas para cada liga
async function scrapAlineacionesLigaMX(date = null) {
  return await scrapAlineaciones('mex.1', 'Liga MX', date);
}

async function scrapAlineacionesPremier(date = null) {
  return await scrapAlineaciones('eng.1', 'Premier League', date);
}

async function scrapAlineacionesLaLiga(date = null) {
  return await scrapAlineaciones('esp.1', 'La Liga', date);
}

async function scrapAlineacionesSerieA(date = null) {
  return await scrapAlineaciones('ita.1', 'Serie A', date);
}

async function scrapAlineacionesBundesliga(date = null) {
  return await scrapAlineaciones('ger.1', 'Bundesliga', date);
}

async function scrapAlineacionesLigue1(date = null) {
  return await scrapAlineaciones('fra.1', 'Ligue 1', date);
}

/**
 * Obtener alineaciones de todas las ligas
 * @param {string} date - Fecha opcional YYYYMMDD
 * @returns {Promise<Object>} Alineaciones de todas las ligas
 */
async function scrapAlineacionesTodasLasLigas(date = null) {
  try {
    console.log(`⚽ Obteniendo alineaciones de todas las ligas...`);
    
    const [ligaMX, premier, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
      scrapAlineacionesLigaMX(date).catch(err => ({ error: true, liga: 'Liga MX', mensaje: err.message })),
      scrapAlineacionesPremier(date).catch(err => ({ error: true, liga: 'Premier League', mensaje: err.message })),
      scrapAlineacionesLaLiga(date).catch(err => ({ error: true, liga: 'La Liga', mensaje: err.message })),
      scrapAlineacionesSerieA(date).catch(err => ({ error: true, liga: 'Serie A', mensaje: err.message })),
      scrapAlineacionesBundesliga(date).catch(err => ({ error: true, liga: 'Bundesliga', mensaje: err.message })),
      scrapAlineacionesLigue1(date).catch(err => ({ error: true, liga: 'Ligue 1', mensaje: err.message }))
    ]);
    
    const todasLasAlineaciones = [ligaMX, premier, laLiga, serieA, bundesliga, ligue1];
    const totalPartidos = todasLasAlineaciones.reduce((sum, liga) => 
      sum + (liga.totalPartidos || 0), 0);
    const totalDisponibles = todasLasAlineaciones.reduce((sum, liga) => 
      sum + (liga.alineacionesDisponibles || 0), 0);
    
    return {
      actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      fecha: date || new Date().toISOString().split('T')[0],
      totalLigas: 6,
      totalPartidos: totalPartidos,
      alineacionesDisponibles: totalDisponibles,
      ligas: {
        ligaMX: ligaMX,
        premierLeague: premier,
        laLiga: laLiga,
        serieA: serieA,
        bundesliga: bundesliga,
        ligue1: ligue1
      }
    };
    
  } catch (error) {
    console.error(`❌ Error obteniendo alineaciones de todas las ligas:`, error.message);
    throw new Error(`No se pudieron obtener las alineaciones: ${error.message}`);
  }
}

module.exports = {
  scrapAlineaciones,
  scrapAlineacionPartido,
  scrapAlineacionesLigaMX,
  scrapAlineacionesPremier,
  scrapAlineacionesLaLiga,
  scrapAlineacionesSerieA,
  scrapAlineacionesBundesliga,
  scrapAlineacionesLigue1,
  scrapAlineacionesTodasLasLigas,
  getLineupFromESPN,
  getPlayerPhoto,
  getPhotoStats,
  clearPhotoCache
};

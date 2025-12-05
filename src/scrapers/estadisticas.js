const axios = require("axios");

const LEAGUE_CODES = {
  ligaMX: { code: 'mex.1', name: 'Liga MX' },
  premier: { code: 'eng.1', name: 'Premier League' },
  laLiga: { code: 'esp.1', name: 'La Liga' },
  serieA: { code: 'ita.1', name: 'Serie A' },
  bundesliga: { code: 'ger.1', name: 'Bundesliga' },
  ligue1: { code: 'fra.1', name: 'Ligue 1' }
};

async function getMatchStatistics(eventId) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${eventId}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    const data = response.data;
    
    if (!data) {
      return null;
    }

    const header = data.header || {};
    const competition = header.competitions?.[0] || {};
    const competitors = competition.competitors || [];
    const boxscore = data.boxscore || {};
    const keyEvents = data.keyEvents || [];
    const commentary = data.commentary || [];
    
    const homeTeam = competitors.find(c => c.homeAway === 'home') || competitors[0];
    const awayTeam = competitors.find(c => c.homeAway === 'away') || competitors[1];

    const estadisticasEquipos = boxscore.teams || [];
    
    const processTeamStats = (teamStats) => {
      if (!teamStats || !teamStats.statistics) return null;
      
      const stats = {};
      teamStats.statistics.forEach(stat => {
        const key = stat.name?.toLowerCase().replace(/\s+/g, '_') || stat.label?.toLowerCase().replace(/\s+/g, '_');
        if (key) {
          stats[key] = {
            valor: stat.displayValue || stat.value || '0',
            porcentaje: stat.displayValue?.includes('%') ? stat.displayValue : null
          };
        }
      });
      
      return {
        equipo: {
          id: teamStats.team?.id,
          nombre: teamStats.team?.displayName,
          nombreCorto: teamStats.team?.abbreviation,
          logo: teamStats.team?.logo
        },
        estadisticas: {
          posesion: stats['ball_possession'] || stats['possession'] || { valor: '0%' },
          tiros: {
            totales: stats['total_shots'] || stats['shots'] || { valor: '0' },
            aPorteria: stats['shots_on_target'] || stats['shots_on_goal'] || { valor: '0' },
            fueraPorteria: stats['shots_off_target'] || { valor: '0' },
            bloqueados: stats['blocked_shots'] || { valor: '0' }
          },
          pases: {
            totales: stats['total_passes'] || stats['passes'] || { valor: '0' },
            completados: stats['passes_completed'] || stats['accurate_passes'] || { valor: '0' },
            precision: stats['passing_accuracy'] || stats['pass_accuracy'] || { valor: '0%' }
          },
          corners: stats['corner_kicks'] || stats['corners'] || { valor: '0' },
          faltas: stats['fouls'] || stats['fouls_committed'] || { valor: '0' },
          fuerasDeJuego: stats['offsides'] || { valor: '0' },
          tarjetas: {
            amarillas: stats['yellow_cards'] || { valor: '0' },
            rojas: stats['red_cards'] || { valor: '0' }
          },
          salvadas: stats['saves'] || stats['goalkeeper_saves'] || { valor: '0' },
          despejes: stats['clearances'] || { valor: '0' },
          intercepciones: stats['interceptions'] || { valor: '0' },
          entradas: stats['tackles'] || { valor: '0' },
          duelos: {
            ganados: stats['duels_won'] || { valor: '0' },
            perdidos: stats['duels_lost'] || { valor: '0' }
          },
          duelosAereos: {
            ganados: stats['aerial_duels_won'] || { valor: '0' },
            perdidos: stats['aerial_duels_lost'] || { valor: '0' }
          }
        }
      };
    };

    const localStats = processTeamStats(estadisticasEquipos.find(t => t.team?.id === homeTeam?.team?.id) || estadisticasEquipos[0]);
    const visitanteStats = processTeamStats(estadisticasEquipos.find(t => t.team?.id === awayTeam?.team?.id) || estadisticasEquipos[1]);

    const goles = [];
    const tarjetas = [];
    const cambios = [];
    const eventosImportantes = [];

    keyEvents.forEach(event => {
      const eventData = {
        id: event.id,
        minuto: event.clock?.displayValue || event.time?.displayValue || 'N/A',
        periodo: event.period?.number || 1,
        tipo: event.type?.text || event.type?.name || 'Evento',
        descripcion: event.text || '',
        equipo: event.team?.displayName || null,
        equipoId: event.team?.id || null,
        equipoLogo: event.team?.logo || null
      };

      if (event.scoringPlay) {
        const jugadores = event.athletesInvolved || [];
        goles.push({
          ...eventData,
          goleador: jugadores[0]?.displayName || 'Desconocido',
          goleadorId: jugadores[0]?.id || null,
          goleadorFoto: jugadores[0]?.headshot?.href || null,
          asistencia: jugadores[1]?.displayName || null,
          asistenciaId: jugadores[1]?.id || null,
          tipoGol: event.type?.text || 'Gol',
          esAutogol: event.type?.text?.toLowerCase().includes('own') || false,
          esPenal: event.type?.text?.toLowerCase().includes('penalty') || false,
          marcadorActual: {
            local: event.homeScore || 0,
            visitante: event.awayScore || 0
          }
        });
      }

      if (event.type?.text?.toLowerCase().includes('card') || 
          event.type?.name?.toLowerCase().includes('card')) {
        const jugador = event.athletesInvolved?.[0];
        tarjetas.push({
          ...eventData,
          jugador: jugador?.displayName || 'Desconocido',
          jugadorId: jugador?.id || null,
          jugadorFoto: jugador?.headshot?.href || null,
          jugadorPosicion: jugador?.position?.abbreviation || null,
          tipoTarjeta: event.type?.text?.toLowerCase().includes('red') ? 'roja' : 'amarilla',
          motivo: event.text || null
        });
      }

      if (event.type?.text?.toLowerCase().includes('substitution') ||
          event.type?.name?.toLowerCase().includes('sub')) {
        const jugadores = event.athletesInvolved || [];
        cambios.push({
          ...eventData,
          jugadorEntra: jugadores[0]?.displayName || null,
          jugadorEntraId: jugadores[0]?.id || null,
          jugadorEntraFoto: jugadores[0]?.headshot?.href || null,
          jugadorSale: jugadores[1]?.displayName || null,
          jugadorSaleId: jugadores[1]?.id || null,
          jugadorSaleFoto: jugadores[1]?.headshot?.href || null
        });
      }

      eventosImportantes.push(eventData);
    });

    const estadisticasJugadores = {
      local: [],
      visitante: []
    };

    const boxscorePlayers = boxscore.players || [];
    boxscorePlayers.forEach((teamPlayers, index) => {
      const playerStats = [];
      const statistics = teamPlayers.statistics || [];
      
      statistics.forEach(statGroup => {
        const statNames = statGroup.names || statGroup.labels || [];
        const athletes = statGroup.athletes || [];
        
        athletes.forEach(athlete => {
          const playerData = {
            id: athlete.athlete?.id,
            nombre: athlete.athlete?.displayName,
            nombreCorto: athlete.athlete?.shortName,
            numero: athlete.athlete?.jersey,
            posicion: athlete.athlete?.position?.abbreviation || athlete.athlete?.position?.name,
            foto: athlete.athlete?.headshot?.href || null,
            titular: athlete.starter === true,
            capitan: athlete.captain === true,
            minutos: athlete.stats?.[statNames.indexOf('MIN')] || athlete.stats?.[0] || '0',
            estadisticas: {}
          };

          statNames.forEach((name, i) => {
            const value = athlete.stats?.[i];
            if (value !== undefined && value !== null) {
              const key = name.toLowerCase().replace(/\s+/g, '_');
              playerData.estadisticas[key] = value;
            }
          });

          const existingPlayer = playerStats.find(p => p.id === playerData.id);
          if (existingPlayer) {
            Object.assign(existingPlayer.estadisticas, playerData.estadisticas);
          } else {
            playerStats.push(playerData);
          }
        });
      });

      if (index === 0) {
        estadisticasJugadores.local = playerStats;
      } else {
        estadisticasJugadores.visitante = playerStats;
      }
    });

    const status = competition.status || header.competitions?.[0]?.status || {};
    const statusType = status.type?.name || 'STATUS_SCHEDULED';
    
    const esEnVivo = 
      statusType === 'STATUS_IN_PROGRESS' ||
      statusType === 'STATUS_FIRST_HALF' ||
      statusType === 'STATUS_SECOND_HALF' ||
      statusType === 'STATUS_HALFTIME' ||
      (status.period > 0 && !status.type?.completed);

    return {
      eventoId: eventId,
      partido: {
        nombre: competition.competitors?.map(c => c.team?.displayName).join(' vs ') || 'Partido',
        fecha: competition.date,
        fechaFormateada: competition.date ? new Date(competition.date).toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          dateStyle: 'full',
          timeStyle: 'short'
        }) : null,
        estadio: data.gameInfo?.venue?.fullName || competition.venue?.fullName || null,
        ciudad: data.gameInfo?.venue?.address?.city || competition.venue?.address?.city || null,
        arbitro: data.gameInfo?.officials?.[0]?.displayName || null,
        asistencia: data.gameInfo?.attendance || null
      },
      estado: {
        tipo: statusType,
        descripcion: status.type?.description || 'Programado',
        enVivo: esEnVivo,
        finalizado: statusType === 'STATUS_FINAL' || statusType === 'STATUS_FULL_TIME',
        programado: statusType === 'STATUS_SCHEDULED',
        periodo: status.period || 0,
        reloj: status.displayClock || '0:00',
        tiempoExtra: status.period > 2,
        penales: statusType === 'STATUS_SHOOTOUT' || status.period > 4
      },
      marcador: {
        local: {
          id: homeTeam?.team?.id,
          nombre: homeTeam?.team?.displayName,
          nombreCorto: homeTeam?.team?.abbreviation,
          logo: homeTeam?.team?.logo,
          goles: parseInt(homeTeam?.score) || 0,
          ganador: homeTeam?.winner || false
        },
        visitante: {
          id: awayTeam?.team?.id,
          nombre: awayTeam?.team?.displayName,
          nombreCorto: awayTeam?.team?.abbreviation,
          logo: awayTeam?.team?.logo,
          goles: parseInt(awayTeam?.score) || 0,
          ganador: awayTeam?.winner || false
        }
      },
      estadisticasEquipos: {
        local: localStats,
        visitante: visitanteStats,
        comparativa: localStats && visitanteStats ? {
          posesion: {
            local: localStats.estadisticas.posesion.valor,
            visitante: visitanteStats.estadisticas.posesion.valor
          },
          tiros: {
            local: localStats.estadisticas.tiros.totales.valor,
            visitante: visitanteStats.estadisticas.tiros.totales.valor
          },
          tirosAPorteria: {
            local: localStats.estadisticas.tiros.aPorteria.valor,
            visitante: visitanteStats.estadisticas.tiros.aPorteria.valor
          },
          pases: {
            local: localStats.estadisticas.pases.totales.valor,
            visitante: visitanteStats.estadisticas.pases.totales.valor
          },
          precisionPases: {
            local: localStats.estadisticas.pases.precision.valor,
            visitante: visitanteStats.estadisticas.pases.precision.valor
          },
          corners: {
            local: localStats.estadisticas.corners.valor,
            visitante: visitanteStats.estadisticas.corners.valor
          },
          faltas: {
            local: localStats.estadisticas.faltas.valor,
            visitante: visitanteStats.estadisticas.faltas.valor
          },
          tarjetasAmarillas: {
            local: localStats.estadisticas.tarjetas.amarillas.valor,
            visitante: visitanteStats.estadisticas.tarjetas.amarillas.valor
          },
          tarjetasRojas: {
            local: localStats.estadisticas.tarjetas.rojas.valor,
            visitante: visitanteStats.estadisticas.tarjetas.rojas.valor
          }
        } : null
      },
      eventos: {
        goles: goles.sort((a, b) => parseInt(a.minuto) - parseInt(b.minuto)),
        tarjetas: tarjetas.sort((a, b) => parseInt(a.minuto) - parseInt(b.minuto)),
        cambios: cambios.sort((a, b) => parseInt(a.minuto) - parseInt(b.minuto)),
        todos: eventosImportantes.sort((a, b) => parseInt(a.minuto) - parseInt(b.minuto)),
        resumen: {
          totalGoles: goles.length,
          totalTarjetasAmarillas: tarjetas.filter(t => t.tipoTarjeta === 'amarilla').length,
          totalTarjetasRojas: tarjetas.filter(t => t.tipoTarjeta === 'roja').length,
          totalCambios: cambios.length
        }
      },
      estadisticasJugadores: estadisticasJugadores,
      jugadoresDestacados: {
        goleadores: goles.map(g => ({
          nombre: g.goleador,
          id: g.goleadorId,
          foto: g.goleadorFoto,
          equipo: g.equipo,
          goles: goles.filter(gl => gl.goleadorId === g.goleadorId).length
        })).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i),
        asistencias: goles.filter(g => g.asistencia).map(g => ({
          nombre: g.asistencia,
          id: g.asistenciaId,
          equipo: g.equipo
        })).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i),
        tarjetasAmarillas: tarjetas.filter(t => t.tipoTarjeta === 'amarilla').map(t => ({
          nombre: t.jugador,
          id: t.jugadorId,
          equipo: t.equipo,
          minuto: t.minuto
        })),
        tarjetasRojas: tarjetas.filter(t => t.tipoTarjeta === 'roja').map(t => ({
          nombre: t.jugador,
          id: t.jugadorId,
          equipo: t.equipo,
          minuto: t.minuto
        }))
      },
      fuente: 'ESPN',
      actualizado: new Date().toISOString(),
      actualizadoFormateado: new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City'
      })
    };

  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas del partido ${eventId}:`, error.message);
    return null;
  }
}

async function scrapEstadisticas(leagueCode, leagueName, date = null) {
  try {
    console.log(`📊 Obteniendo estadísticas de ${leagueName}...`);
    
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
        codigoLiga: leagueCode,
        fecha: date || new Date().toISOString().split('T')[0],
        totalPartidos: 0,
        partidos: [],
        mensaje: 'No hay partidos para esta fecha'
      };
    }

    const partidosConStats = await Promise.all(
      events.map(async (event) => {
        const eventId = event.id;
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        const status = event.status;
        
        const homeTeam = competitors.find(c => c.homeAway === 'home') || competitors[0];
        const awayTeam = competitors.find(c => c.homeAway === 'away') || competitors[1];
        
        const statusType = status.type?.name || 'STATUS_SCHEDULED';
        const esEnVivo = 
          statusType === 'STATUS_IN_PROGRESS' ||
          statusType === 'STATUS_FIRST_HALF' ||
          statusType === 'STATUS_SECOND_HALF' ||
          statusType === 'STATUS_HALFTIME';
        const haTerminado = statusType === 'STATUS_FINAL' || statusType === 'STATUS_FULL_TIME';

        if (esEnVivo || haTerminado) {
          const statsCompletas = await getMatchStatistics(eventId);
          
          if (statsCompletas) {
            return statsCompletas;
          }
        }

        return {
          eventoId: eventId,
          partido: {
            nombre: `${homeTeam.team.displayName} vs ${awayTeam.team.displayName}`,
            fecha: event.date,
            fechaFormateada: new Date(event.date).toLocaleString('es-MX', {
              timeZone: 'America/Mexico_City',
              dateStyle: 'short',
              timeStyle: 'short'
            }),
            estadio: competition.venue?.fullName || null
          },
          estado: {
            tipo: statusType,
            descripcion: status.type?.description || 'Programado',
            enVivo: esEnVivo,
            finalizado: haTerminado,
            programado: statusType === 'STATUS_SCHEDULED'
          },
          marcador: {
            local: {
              id: homeTeam.team.id,
              nombre: homeTeam.team.displayName,
              nombreCorto: homeTeam.team.abbreviation,
              logo: homeTeam.team.logo,
              goles: parseInt(homeTeam.score) || 0
            },
            visitante: {
              id: awayTeam.team.id,
              nombre: awayTeam.team.displayName,
              nombreCorto: awayTeam.team.abbreviation,
              logo: awayTeam.team.logo,
              goles: parseInt(awayTeam.score) || 0
            }
          },
          estadisticasDisponibles: false,
          mensaje: 'Estadísticas disponibles cuando el partido esté en vivo o haya terminado'
        };
      })
    );

    const enVivo = partidosConStats.filter(p => p.estado?.enVivo);
    const finalizados = partidosConStats.filter(p => p.estado?.finalizado);
    const programados = partidosConStats.filter(p => p.estado?.programado);

    return {
      liga: leagueName,
      codigoLiga: leagueCode,
      fecha: date || new Date().toISOString().split('T')[0],
      actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      resumen: {
        totalPartidos: partidosConStats.length,
        enVivo: enVivo.length,
        finalizados: finalizados.length,
        programados: programados.length,
        conEstadisticas: partidosConStats.filter(p => p.estadisticasEquipos).length
      },
      partidos: partidosConStats,
      partidosEnVivo: enVivo,
      partidosFinalizados: finalizados,
      partidosProgramados: programados
    };

  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas de ${leagueName}:`, error.message);
    throw new Error(`No se pudieron obtener las estadísticas de ${leagueName}: ${error.message}`);
  }
}

async function scrapEstadisticasLigaMX(date = null) {
  return await scrapEstadisticas('mex.1', 'Liga MX', date);
}

async function scrapEstadisticasPremier(date = null) {
  return await scrapEstadisticas('eng.1', 'Premier League', date);
}

async function scrapEstadisticasLaLiga(date = null) {
  return await scrapEstadisticas('esp.1', 'La Liga', date);
}

async function scrapEstadisticasSerieA(date = null) {
  return await scrapEstadisticas('ita.1', 'Serie A', date);
}

async function scrapEstadisticasBundesliga(date = null) {
  return await scrapEstadisticas('ger.1', 'Bundesliga', date);
}

async function scrapEstadisticasLigue1(date = null) {
  return await scrapEstadisticas('fra.1', 'Ligue 1', date);
}

async function scrapEstadisticasTodasLasLigas(date = null) {
  try {
    console.log(`📊 Obteniendo estadísticas de todas las ligas...`);
    
    const [ligaMX, premier, laLiga, serieA, bundesliga, ligue1] = await Promise.all([
      scrapEstadisticasLigaMX(date).catch(err => ({ error: true, liga: 'Liga MX', mensaje: err.message })),
      scrapEstadisticasPremier(date).catch(err => ({ error: true, liga: 'Premier League', mensaje: err.message })),
      scrapEstadisticasLaLiga(date).catch(err => ({ error: true, liga: 'La Liga', mensaje: err.message })),
      scrapEstadisticasSerieA(date).catch(err => ({ error: true, liga: 'Serie A', mensaje: err.message })),
      scrapEstadisticasBundesliga(date).catch(err => ({ error: true, liga: 'Bundesliga', mensaje: err.message })),
      scrapEstadisticasLigue1(date).catch(err => ({ error: true, liga: 'Ligue 1', mensaje: err.message }))
    ]);
    
    const todasLasEstadisticas = [ligaMX, premier, laLiga, serieA, bundesliga, ligue1];
    
    const totalPartidos = todasLasEstadisticas.reduce((sum, liga) => 
      sum + (liga.resumen?.totalPartidos || 0), 0);
    const totalEnVivo = todasLasEstadisticas.reduce((sum, liga) => 
      sum + (liga.resumen?.enVivo || 0), 0);
    const totalFinalizados = todasLasEstadisticas.reduce((sum, liga) => 
      sum + (liga.resumen?.finalizados || 0), 0);
    const totalConStats = todasLasEstadisticas.reduce((sum, liga) => 
      sum + (liga.resumen?.conEstadisticas || 0), 0);

    const todosEnVivo = todasLasEstadisticas
      .filter(liga => !liga.error)
      .flatMap(liga => liga.partidosEnVivo || []);
    
    const todosFinalizados = todasLasEstadisticas
      .filter(liga => !liga.error)
      .flatMap(liga => liga.partidosFinalizados || []);

    return {
      actualizado: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      fecha: date || new Date().toISOString().split('T')[0],
      resumenGlobal: {
        totalLigas: 6,
        totalPartidos: totalPartidos,
        enVivo: totalEnVivo,
        finalizados: totalFinalizados,
        conEstadisticas: totalConStats
      },
      partidosEnVivoGlobal: todosEnVivo,
      partidosFinalizadosGlobal: todosFinalizados.slice(0, 20),
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
    console.error(`❌ Error obteniendo estadísticas de todas las ligas:`, error.message);
    throw new Error(`No se pudieron obtener las estadísticas: ${error.message}`);
  }
}

async function scrapEstadisticasPartido(eventId) {
  try {
    console.log(`📊 Obteniendo estadísticas del partido ${eventId}...`);
    
    const stats = await getMatchStatistics(eventId);
    
    if (!stats) {
      return {
        eventoId: eventId,
        error: true,
        mensaje: 'No se pudieron obtener las estadísticas. El partido puede no haber iniciado aún.',
        sugerencia: 'Las estadísticas detalladas están disponibles cuando el partido está en vivo o ha terminado.'
      };
    }
    
    return stats;
    
  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas del partido ${eventId}:`, error.message);
    throw new Error(`No se pudieron obtener las estadísticas del partido: ${error.message}`);
  }
}

module.exports = {
  getMatchStatistics,
  scrapEstadisticas,
  scrapEstadisticasLigaMX,
  scrapEstadisticasPremier,
  scrapEstadisticasLaLiga,
  scrapEstadisticasSerieA,
  scrapEstadisticasBundesliga,
  scrapEstadisticasLigue1,
  scrapEstadisticasTodasLasLigas,
  scrapEstadisticasPartido,
  LEAGUE_CODES
};

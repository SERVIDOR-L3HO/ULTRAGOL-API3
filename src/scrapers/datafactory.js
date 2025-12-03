const axios = require("axios");

const ESPN_LEAGUE_IDS = {
  ecuador: { id: "ecu.1", name: "Liga Pro Ecuador", country: "Ecuador" },
  argentina: { id: "arg.1", name: "Liga Profesional Argentina", country: "Argentina" },
  mexico: { id: "mex.1", name: "Liga MX", country: "México" },
  colombia: { id: "col.1", name: "Liga BetPlay", country: "Colombia" },
  chile: { id: "chi.1", name: "Primera División Chile", country: "Chile" },
  peru: { id: "per.1", name: "Liga 1 Perú", country: "Perú" },
  bolivia: { id: "bol.1", name: "División Profesional Bolivia", country: "Bolivia" },
  venezuela: { id: "ven.1", name: "Liga FUTVE", country: "Venezuela" },
  paraguay: { id: "par.1", name: "División de Honor Paraguay", country: "Paraguay" },
  uruguay: { id: "uru.1", name: "Primera División Uruguay", country: "Uruguay" },
  brasil: { id: "bra.1", name: "Brasileirão", country: "Brasil" },
  copalibertadores: { id: "conmebol.libertadores", name: "Copa Libertadores", country: "Sudamérica" },
  copasudamericana: { id: "conmebol.sudamericana", name: "Copa Sudamericana", country: "Sudamérica" }
};

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";

async function obtenerPartidosESPN(leagueId) {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/${leagueId}/scoreboard`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error ESPN ${leagueId}:`, error.message);
    return null;
  }
}

async function obtenerTablaPosicionesESPN(leagueId) {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/${leagueId}/standings`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error Standings ESPN ${leagueId}:`, error.message);
    return null;
  }
}

async function obtenerEquiposESPN(leagueId) {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/${leagueId}/teams`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error Teams ESPN ${leagueId}:`, error.message);
    return null;
  }
}

async function scrapDataFactoryLiga(pais = "ecuador") {
  const startTime = Date.now();
  const paisLower = pais.toLowerCase();
  const leagueInfo = ESPN_LEAGUE_IDS[paisLower];
  
  if (!leagueInfo) {
    return {
      liga: pais.toUpperCase(),
      error: "Liga no disponible",
      ligasDisponibles: Object.keys(ESPN_LEAGUE_IDS),
      partidos: [],
      actualizacion: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
    };
  }
  
  console.log(`⚽ Obteniendo datos de ${leagueInfo.name} (${leagueInfo.country})...`);
  
  try {
    const [partidosData, standingsData, teamsData] = await Promise.all([
      obtenerPartidosESPN(leagueInfo.id),
      obtenerTablaPosicionesESPN(leagueInfo.id),
      obtenerEquiposESPN(leagueInfo.id)
    ]);
    
    const partidos = [];
    
    if (partidosData && partidosData.events) {
      partidosData.events.forEach(evento => {
        const competidores = evento.competitions?.[0]?.competitors || [];
        const local = competidores.find(c => c.homeAway === 'home');
        const visitante = competidores.find(c => c.homeAway === 'away');
        
        if (local && visitante) {
          const golesLocal = parseInt(local.score) || 0;
          const golesVisitante = parseInt(visitante.score) || 0;
          
          partidos.push({
            id: evento.id,
            nombre: evento.name,
            fecha: evento.date,
            fechaFormateada: new Date(evento.date).toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            hora: new Date(evento.date).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            estado: evento.status?.type?.description || 'Programado',
            estadoCorto: evento.status?.type?.shortDetail || '',
            minuto: evento.status?.displayClock || '',
            local: {
              id: local.team?.id,
              nombre: local.team?.shortDisplayName || local.team?.displayName,
              nombreCompleto: local.team?.displayName,
              logo: local.team?.logo,
              abreviatura: local.team?.abbreviation,
              goles: golesLocal,
              estadisticas: local.statistics || []
            },
            visitante: {
              id: visitante.team?.id,
              nombre: visitante.team?.shortDisplayName || visitante.team?.displayName,
              nombreCompleto: visitante.team?.displayName,
              logo: visitante.team?.logo,
              abreviatura: visitante.team?.abbreviation,
              goles: golesVisitante,
              estadisticas: visitante.statistics || []
            },
            marcador: `${golesLocal} - ${golesVisitante}`,
            estadio: evento.competitions?.[0]?.venue?.fullName || '',
            ciudad: evento.competitions?.[0]?.venue?.address?.city || '',
            jornada: evento.competitions?.[0]?.notes?.[0]?.headline || '',
            transmision: evento.competitions?.[0]?.broadcasts?.map(b => b.names?.join(', ')).filter(Boolean) || [],
            resultado: determinarResultado(golesLocal, golesVisitante),
            detalles: {
              asistencia: evento.competitions?.[0]?.attendance || null,
              arbitro: evento.competitions?.[0]?.officials?.find(o => o.position === 'Referee')?.displayName || ''
            }
          });
        }
      });
    }
    
    const tablaPosiciones = [];
    if (standingsData && standingsData.children) {
      standingsData.children.forEach(grupo => {
        if (grupo.standings?.entries) {
          grupo.standings.entries.forEach((entry, idx) => {
            const stats = {};
            entry.stats?.forEach(stat => {
              stats[stat.name] = stat.value;
            });
            
            tablaPosiciones.push({
              posicion: idx + 1,
              grupo: grupo.name || 'General',
              equipo: {
                id: entry.team?.id,
                nombre: entry.team?.shortDisplayName || entry.team?.displayName,
                nombreCompleto: entry.team?.displayName,
                logo: entry.team?.logos?.[0]?.href || entry.team?.logo,
                abreviatura: entry.team?.abbreviation
              },
              estadisticas: {
                pj: stats.gamesPlayed || 0,
                pg: stats.wins || 0,
                pe: stats.ties || 0,
                pp: stats.losses || 0,
                gf: stats.pointsFor || 0,
                gc: stats.pointsAgainst || 0,
                dg: stats.pointDifferential || 0,
                pts: stats.points || 0
              },
              forma: entry.stats?.find(s => s.name === 'streak')?.value || ''
            });
          });
        }
      });
    }
    
    const equipos = [];
    if (teamsData && teamsData.sports?.[0]?.leagues?.[0]?.teams) {
      teamsData.sports[0].leagues[0].teams.forEach(teamWrapper => {
        const team = teamWrapper.team;
        equipos.push({
          id: team.id,
          nombre: team.shortDisplayName || team.displayName,
          nombreCompleto: team.displayName,
          abreviatura: team.abbreviation,
          logo: team.logos?.[0]?.href || '',
          color: team.color ? `#${team.color}` : null,
          colorAlterno: team.alternateColor ? `#${team.alternateColor}` : null,
          ubicacion: team.location || '',
          estadio: team.venue?.fullName || '',
          enlace: team.links?.find(l => l.rel?.includes('clubhouse'))?.href || ''
        });
      });
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ ${leagueInfo.name}: ${partidos.length} partidos, ${tablaPosiciones.length} equipos en tabla en ${elapsed}ms`);
    
    return {
      liga: leagueInfo.name,
      pais: leagueInfo.country,
      codigo: paisLower,
      leagueId: leagueInfo.id,
      fuente: "ESPN API",
      totalPartidos: partidos.length,
      partidos: partidos,
      tablaPosiciones: tablaPosiciones,
      equipos: equipos,
      estadisticas: calcularEstadisticas(partidos),
      actualizacion: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      tiempoRespuesta: `${elapsed}ms`
    };
    
  } catch (error) {
    console.error(`❌ Error ${leagueInfo.name}:`, error.message);
    return {
      liga: leagueInfo.name,
      pais: leagueInfo.country,
      codigo: paisLower,
      error: error.message,
      partidos: [],
      actualizacion: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
    };
  }
}

function determinarResultado(golesLocal, golesVisitante) {
  if (golesLocal > golesVisitante) return 'victoria_local';
  if (golesLocal < golesVisitante) return 'victoria_visitante';
  return 'empate';
}

function calcularEstadisticas(partidos) {
  if (partidos.length === 0) {
    return {
      totalPartidos: 0,
      partidosFinalizados: 0,
      partidosEnVivo: 0,
      partidosProgramados: 0,
      totalGoles: 0,
      golesPorPartido: 0
    };
  }
  
  const finalizados = partidos.filter(p => 
    p.estado?.toLowerCase().includes('final') || 
    p.estado?.toLowerCase().includes('terminado')
  );
  
  const enVivo = partidos.filter(p => 
    p.estado?.toLowerCase().includes('vivo') || 
    p.estado?.toLowerCase().includes('live') ||
    p.estado?.toLowerCase().includes('progress')
  );
  
  const programados = partidos.filter(p => 
    p.estado?.toLowerCase().includes('programado') || 
    p.estado?.toLowerCase().includes('scheduled')
  );
  
  const golesLocal = partidos.reduce((sum, p) => sum + (p.local?.goles || 0), 0);
  const golesVisitante = partidos.reduce((sum, p) => sum + (p.visitante?.goles || 0), 0);
  const totalGoles = golesLocal + golesVisitante;
  
  const empates = partidos.filter(p => p.resultado === 'empate').length;
  const victoriasLocal = partidos.filter(p => p.resultado === 'victoria_local').length;
  const victoriasVisitante = partidos.filter(p => p.resultado === 'victoria_visitante').length;
  
  return {
    totalPartidos: partidos.length,
    partidosFinalizados: finalizados.length,
    partidosEnVivo: enVivo.length,
    partidosProgramados: programados.length,
    totalGoles,
    golesLocal,
    golesVisitante,
    golesPorPartido: partidos.length > 0 ? (totalGoles / partidos.length).toFixed(2) : 0,
    empates,
    victoriasLocal,
    victoriasVisitante,
    distribucion: {
      porcentajeVictoriasLocal: partidos.length > 0 ? ((victoriasLocal / partidos.length) * 100).toFixed(1) + '%' : '0%',
      porcentajeEmpates: partidos.length > 0 ? ((empates / partidos.length) * 100).toFixed(1) + '%' : '0%',
      porcentajeVictoriasVisitante: partidos.length > 0 ? ((victoriasVisitante / partidos.length) * 100).toFixed(1) + '%' : '0%'
    }
  };
}

async function scrapTodasLasLigasDataFactory() {
  console.log("🌎 Obteniendo TODO de TODAS las ligas de Latinoamérica...");
  const startTime = Date.now();
  
  const paises = Object.keys(ESPN_LEAGUE_IDS);
  
  const resultados = await Promise.all(
    paises.map(pais => scrapDataFactoryLiga(pais).catch(err => ({
      liga: pais.toUpperCase(),
      error: err.message,
      partidos: []
    })))
  );
  
  const ligasConDatos = resultados.filter(r => !r.error && r.partidos && r.partidos.length > 0);
  const ligasSinPartidos = resultados.filter(r => !r.error && (!r.partidos || r.partidos.length === 0));
  const ligasConError = resultados.filter(r => r.error);
  
  const totalPartidos = resultados.reduce((sum, liga) => sum + (liga.totalPartidos || 0), 0);
  const totalGoles = resultados.reduce((sum, liga) => sum + (liga.estadisticas?.totalGoles || 0), 0);
  const totalEquipos = resultados.reduce((sum, liga) => sum + (liga.equipos?.length || 0), 0);
  
  const partidosEnVivo = resultados.reduce((sum, liga) => sum + (liga.estadisticas?.partidosEnVivo || 0), 0);
  const partidosProgramados = resultados.reduce((sum, liga) => sum + (liga.estadisticas?.partidosProgramados || 0), 0);
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ TODAS LAS LIGAS: ${ligasConDatos.length} con partidos, ${totalPartidos} partidos totales en ${elapsed}ms`);
  
  return {
    fuente: "ESPN API - Ligas Latinoamericanas",
    descripcion: "Datos completos de todas las ligas de fútbol de Latinoamérica incluyendo Copa Libertadores y Copa Sudamericana",
    resumen: {
      totalLigas: paises.length,
      ligasConPartidos: ligasConDatos.length,
      ligasSinPartidosHoy: ligasSinPartidos.length,
      ligasConError: ligasConError.length,
      totalPartidos,
      totalGoles,
      totalEquipos,
      partidosEnVivo,
      partidosProgramados
    },
    ligasDisponibles: paises.map(p => ({
      codigo: p,
      nombre: ESPN_LEAGUE_IDS[p].name,
      pais: ESPN_LEAGUE_IDS[p].country,
      endpoint: `/datafactory/${p}`
    })),
    ligas: resultados.reduce((acc, liga) => {
      const codigo = liga.codigo || liga.liga?.toLowerCase().replace(/\s+/g, '');
      acc[codigo] = liga;
      return acc;
    }, {}),
    actualizacion: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    tiempoRespuesta: `${elapsed}ms`
  };
}

const DATAFACTORY_URLS = Object.keys(ESPN_LEAGUE_IDS).reduce((acc, key) => {
  acc[key] = `ESPN API - ${ESPN_LEAGUE_IDS[key].name}`;
  return acc;
}, {});

module.exports = {
  scrapDataFactoryLiga,
  scrapTodasLasLigasDataFactory,
  DATAFACTORY_URLS,
  ESPN_LEAGUE_IDS
};

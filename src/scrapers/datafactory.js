const axios = require("axios");

const ESPN_LEAGUE_IDS = {
  // LIGAS SUDAMERICANAS
  ecuador: { id: "ecu.1", name: "Liga Pro Ecuador", country: "Ecuador" },
  argentina: { id: "arg.1", name: "Liga Profesional Argentina", country: "Argentina" },
  mexico: { id: "mex.1", name: "Liga MX", country: "México" },
  colombia: { id: "col.1", name: "Liga BetPlay Colombia", country: "Colombia" },
  chile: { id: "chi.1", name: "Primera División Chile", country: "Chile" },
  peru: { id: "per.1", name: "Liga 1 Perú", country: "Perú" },
  bolivia: { id: "bol.1", name: "División Profesional Bolivia", country: "Bolivia" },
  venezuela: { id: "ven.1", name: "Liga FUTVE Venezuela", country: "Venezuela" },
  paraguay: { id: "par.1", name: "División de Honor Paraguay", country: "Paraguay" },
  uruguay: { id: "uru.1", name: "Primera División Uruguay", country: "Uruguay" },
  brasil: { id: "bra.1", name: "Brasileirão", country: "Brasil" },
  
  // COPAS CONMEBOL
  copalibertadores: { id: "conmebol.libertadores", name: "Copa Libertadores", country: "CONMEBOL" },
  copasudamericana: { id: "conmebol.sudamericana", name: "Copa Sudamericana", country: "CONMEBOL" },
  recopasudamericana: { id: "conmebol.recopa", name: "Recopa Sudamericana", country: "CONMEBOL" },
  copaamerica: { id: "conmebol.america", name: "Copa América", country: "CONMEBOL" },
  eliminatoriasconmebol: { id: "conmebol.worldq.sudamerica", name: "Eliminatorias CONMEBOL", country: "CONMEBOL" },
  
  // LIGAS EUROPEAS TOP 5
  premierleague: { id: "eng.1", name: "Premier League", country: "Inglaterra" },
  laliga: { id: "esp.1", name: "La Liga", country: "España" },
  seriea: { id: "ita.1", name: "Serie A", country: "Italia" },
  bundesliga: { id: "ger.1", name: "Bundesliga", country: "Alemania" },
  ligue1: { id: "fra.1", name: "Ligue 1", country: "Francia" },
  
  // OTRAS LIGAS EUROPEAS
  portugal: { id: "por.1", name: "Liga Portugal", country: "Portugal" },
  eredivisie: { id: "ned.1", name: "Eredivisie", country: "Países Bajos" },
  belgica: { id: "bel.1", name: "Pro League Bélgica", country: "Bélgica" },
  escocia: { id: "sco.1", name: "Scottish Premiership", country: "Escocia" },
  turquia: { id: "tur.1", name: "Süper Lig Turquía", country: "Turquía" },
  grecia: { id: "gre.1", name: "Super League Grecia", country: "Grecia" },
  austria: { id: "aut.1", name: "Bundesliga Austria", country: "Austria" },
  suiza: { id: "sui.1", name: "Super League Suiza", country: "Suiza" },
  rusia: { id: "rus.1", name: "Premier League Rusia", country: "Rusia" },
  ucrania: { id: "ukr.1", name: "Premier League Ucrania", country: "Ucrania" },
  
  // COPAS NACIONALES EUROPEAS
  supercopa_espana: { id: "esp.super_cup", name: "Supercopa de España", country: "España" },
  copa_del_rey: { id: "esp.copa_del_rey", name: "Copa del Rey", country: "España" },
  fa_cup: { id: "eng.fa", name: "FA Cup", country: "Inglaterra" },
  coppa_italia: { id: "ita.coppa_italia", name: "Coppa Italia", country: "Italia" },
  dfb_pokal: { id: "ger.dfb_pokal", name: "DFB Pokal", country: "Alemania" },
  coupe_france: { id: "fra.coupe_de_france", name: "Coupe de France", country: "Francia" },
  
  // COMPETICIONES UEFA
  championsleague: { id: "uefa.champions", name: "UEFA Champions League", country: "UEFA" },
  europaleague: { id: "uefa.europa", name: "UEFA Europa League", country: "UEFA" },
  conferenceleague: { id: "uefa.europa.conf", name: "UEFA Conference League", country: "UEFA" },
  supercopa_uefa: { id: "uefa.super_cup", name: "Supercopa UEFA", country: "UEFA" },
  eurocopa: { id: "uefa.euro", name: "UEFA Eurocopa", country: "UEFA" },
  nationsleague: { id: "uefa.nations", name: "UEFA Nations League", country: "UEFA" },
  eliminatorias_uefa: { id: "fifa.worldq.uefa", name: "Eliminatorias UEFA", country: "UEFA" },
  
  // COMPETICIONES FIFA / MUNDIALES
  mundial: { id: "fifa.world", name: "Copa del Mundo FIFA", country: "FIFA" },
  mundial_femenino: { id: "fifa.wwc", name: "Copa del Mundo Femenina FIFA", country: "FIFA" },
  mundial_sub20: { id: "fifa.world.u20", name: "Mundial Sub-20", country: "FIFA" },
  mundial_sub17: { id: "fifa.world.u17", name: "Mundial Sub-17", country: "FIFA" },
  club_world_cup: { id: "fifa.cwc", name: "Copa Mundial de Clubes FIFA", country: "FIFA" },
  copa_intercontinental: { id: "fifa.intercontinental", name: "Copa Intercontinental FIFA", country: "FIFA" },
  
  // COPAS NACIONALES MEXICANAS
  supercopa_mx: { id: "mex.supercopa", name: "Supercopa MX", country: "México" },
  copa_mx: { id: "mex.copa_mx", name: "Copa MX", country: "México" },
  campeones_cup: { id: "concacaf.campeones_cup", name: "Campeones Cup", country: "CONCACAF" },
  
  // COMPETICIONES CONCACAF
  concacaf_cl: { id: "concacaf.champions", name: "CONCACAF Champions Cup", country: "CONCACAF" },
  gold_cup: { id: "concacaf.gold", name: "Copa Oro CONCACAF", country: "CONCACAF" },
  nations_league_concacaf: { id: "concacaf.nations.league", name: "CONCACAF Nations League", country: "CONCACAF" },
  
  // LIGAS ADICIONALES
  mls: { id: "usa.1", name: "MLS", country: "USA" },
  ecuador_serie_b: { id: "ecu.2", name: "Serie B Ecuador", country: "Ecuador" },
  colombia_segunda: { id: "col.2", name: "Torneo BetPlay Colombia", country: "Colombia" },
  segunda_espana: { id: "esp.2", name: "Segunda División España", country: "España" },
  championship: { id: "eng.2", name: "EFL Championship", country: "Inglaterra" },
  serie_b_brasil: { id: "bra.2", name: "Série B Brasil", country: "Brasil" },
  segunda_italia: { id: "ita.2", name: "Serie B Italia", country: "Italia" },
  segunda_alemania: { id: "ger.2", name: "2. Bundesliga", country: "Alemania" },
  
  // LIGAS ASIÁTICAS
  japon: { id: "jpn.1", name: "J1 League", country: "Japón" },
  arabia_saudita: { id: "ksa.1", name: "Saudi Pro League", country: "Arabia Saudita" },
  china: { id: "chn.1", name: "Chinese Super League", country: "China" },
  corea: { id: "kor.1", name: "K League 1", country: "Corea del Sur" },
  australia: { id: "aus.1", name: "A-League", country: "Australia" },
  
  // OTRAS COMPETICIONES INTERNACIONALES
  afc_cl: { id: "afc.champions", name: "AFC Champions League", country: "AFC" },
  africacup: { id: "caf.nations", name: "Copa Africana de Naciones", country: "CAF" },
  caf_cl: { id: "caf.champions", name: "CAF Champions League", country: "CAF" },
  
  // FINALÍSIMA Y ESPECIALES
  finalissima: { id: "uefa.conmebol.finalissima", name: "Finalísima UEFA-CONMEBOL", country: "UEFA/CONMEBOL" },
  
  // FÚTBOL FEMENINO
  nwsl: { id: "usa.nwsl", name: "NWSL (Liga Femenina USA)", country: "USA" },
  wsl: { id: "eng.w.1", name: "WSL (Liga Femenina Inglaterra)", country: "Inglaterra" },
  liga_f: { id: "esp.w.1", name: "Liga F (Liga Femenina España)", country: "España" }
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

const CATEGORIAS_LIGAS = {
  sudamericanas: ['ecuador', 'argentina', 'mexico', 'colombia', 'chile', 'peru', 'bolivia', 'venezuela', 'paraguay', 'uruguay', 'brasil'],
  copas_conmebol: ['copalibertadores', 'copasudamericana', 'recopasudamericana', 'copaamerica', 'eliminatoriasconmebol'],
  europeas_top5: ['premierleague', 'laliga', 'seriea', 'bundesliga', 'ligue1'],
  europeas_otras: ['portugal', 'eredivisie', 'belgica', 'escocia', 'turquia', 'grecia', 'austria', 'suiza', 'rusia', 'ucrania'],
  copas_europeas: ['supercopa_espana', 'copa_del_rey', 'fa_cup', 'coppa_italia', 'dfb_pokal', 'coupe_france'],
  uefa: ['championsleague', 'europaleague', 'conferenceleague', 'supercopa_uefa', 'eurocopa', 'nationsleague', 'eliminatorias_uefa'],
  fifa_mundiales: ['mundial', 'mundial_femenino', 'mundial_sub20', 'mundial_sub17', 'club_world_cup', 'copa_intercontinental'],
  concacaf: ['supercopa_mx', 'copa_mx', 'campeones_cup', 'concacaf_cl', 'gold_cup', 'nations_league_concacaf'],
  ligas_secundarias: ['mls', 'ecuador_serie_b', 'colombia_segunda', 'segunda_espana', 'championship', 'serie_b_brasil', 'segunda_italia', 'segunda_alemania'],
  asiaticas: ['japon', 'arabia_saudita', 'china', 'corea', 'australia'],
  internacionales: ['afc_cl', 'africacup', 'caf_cl', 'finalissima'],
  femenino: ['nwsl', 'wsl', 'liga_f']
};

async function scrapTodasLasLigasDataFactory(categoria = null) {
  console.log("🌍 Obteniendo TODO de TODAS las ligas del mundo...");
  const startTime = Date.now();
  
  let paises;
  if (categoria && CATEGORIAS_LIGAS[categoria]) {
    paises = CATEGORIAS_LIGAS[categoria];
    console.log(`📂 Filtrando por categoría: ${categoria} (${paises.length} ligas)`);
  } else {
    paises = Object.keys(ESPN_LEAGUE_IDS);
  }
  
  const resultados = await Promise.all(
    paises.map(pais => scrapDataFactoryLiga(pais).catch(err => ({
      liga: pais.toUpperCase(),
      codigo: pais,
      error: err.message,
      partidos: [],
      tablaPosiciones: [],
      equipos: []
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
  
  const ligasPorCategoria = {};
  Object.entries(CATEGORIAS_LIGAS).forEach(([cat, codigos]) => {
    ligasPorCategoria[cat] = {
      nombre: formatearNombreCategoria(cat),
      ligas: codigos.map(codigo => ({
        codigo,
        nombre: ESPN_LEAGUE_IDS[codigo]?.name || codigo,
        pais: ESPN_LEAGUE_IDS[codigo]?.country || 'Desconocido',
        endpoint: `/datafactory/${codigo}`
      }))
    };
  });
  
  return {
    fuente: "ESPN API - Todas las Ligas del Mundo",
    descripcion: "Datos completos de todas las ligas de fútbol del mundo: Sudamérica, Europa, CONCACAF, Asia, África, competiciones FIFA y fútbol femenino",
    version: "2.0",
    resumen: {
      totalLigas: Object.keys(ESPN_LEAGUE_IDS).length,
      totalCategorias: Object.keys(CATEGORIAS_LIGAS).length,
      ligasConsultadas: paises.length,
      ligasConPartidos: ligasConDatos.length,
      ligasSinPartidosHoy: ligasSinPartidos.length,
      ligasConError: ligasConError.length,
      totalPartidos,
      totalGoles,
      totalEquipos,
      partidosEnVivo,
      partidosProgramados
    },
    categorias: ligasPorCategoria,
    ligasDisponibles: Object.keys(ESPN_LEAGUE_IDS).map(p => ({
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

function formatearNombreCategoria(cat) {
  const nombres = {
    sudamericanas: "Ligas Sudamericanas",
    copas_conmebol: "Copas CONMEBOL",
    europeas_top5: "Top 5 Ligas Europeas",
    europeas_otras: "Otras Ligas Europeas",
    copas_europeas: "Copas Nacionales Europeas",
    uefa: "Competiciones UEFA",
    fifa_mundiales: "Mundiales y FIFA",
    concacaf: "CONCACAF y México",
    ligas_secundarias: "Segundas Divisiones",
    asiaticas: "Ligas Asiáticas",
    internacionales: "Otras Internacionales",
    femenino: "Fútbol Femenino"
  };
  return nombres[cat] || cat;
}

const DATAFACTORY_URLS = Object.keys(ESPN_LEAGUE_IDS).reduce((acc, key) => {
  acc[key] = `ESPN API - ${ESPN_LEAGUE_IDS[key].name}`;
  return acc;
}, {});

module.exports = {
  scrapDataFactoryLiga,
  scrapTodasLasLigasDataFactory,
  DATAFACTORY_URLS,
  ESPN_LEAGUE_IDS,
  CATEGORIAS_LIGAS
};

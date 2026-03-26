const axios = require("axios");

function calcularContador(fechaISO) {
  const ahora = new Date();
  const partido = new Date(fechaISO);
  const diferencia = partido - ahora;

  if (diferencia <= 0) {
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

function mapearEstado(statusName) {
  const estados = {
    'STATUS_SCHEDULED': 'Programado',
    'STATUS_IN_PROGRESS': 'En vivo',
    'STATUS_FIRST_HALF': 'Primer tiempo',
    'STATUS_HALFTIME': 'Medio tiempo',
    'STATUS_SECOND_HALF': 'Segundo tiempo',
    'STATUS_END_PERIOD': 'Fin de período',
    'STATUS_FULL_TIME': 'Finalizado',
    'STATUS_FINAL': 'Finalizado',
    'STATUS_POSTPONED': 'Pospuesto',
    'STATUS_CANCELED': 'Cancelado',
    'STATUS_SUSPENDED': 'Suspendido'
  };
  return estados[statusName] || statusName;
}

async function scrapCalendario() {
  try {
    const ahora = new Date();
    const inicioTemporada = '20260101';
    const finTemporada = '20260701';

    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard`;
    const response = await axios.get(url, {
      params: {
        limit: 200,
        dates: `${inicioTemporada}-${finTemporada}`
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data;
    const eventos = data.events || [];

    const partidos = eventos.map(event => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home') || competition.competitors[0];
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away') || competition.competitors[1];

      const statusName = event.status?.type?.name || 'STATUS_SCHEDULED';
      const esEnVivo = ['STATUS_IN_PROGRESS', 'STATUS_FIRST_HALF', 'STATUS_HALFTIME', 'STATUS_SECOND_HALF', 'STATUS_END_PERIOD'].includes(statusName);
      const esFinalizado = ['STATUS_FULL_TIME', 'STATUS_FINAL'].includes(statusName);

      let resultado = null;
      if (esFinalizado || esEnVivo) {
        const golesLocal = parseInt(homeTeam.score || '0');
        const golesVisitante = parseInt(awayTeam.score || '0');
        resultado = {
          local: golesLocal,
          visitante: golesVisitante,
          ganador: golesLocal > golesVisitante ? 'local' :
                   golesVisitante > golesLocal ? 'visitante' : 'empate'
        };
      }

      const canalesTV = (competition.broadcasts || [])
        .flatMap(b => b.names || [])
        .join(', ') || 'Por confirmar';

      const fechaLocal = new Date(event.date).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'full',
        timeStyle: 'short'
      });

      const horaLocal = new Date(event.date).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const fechaCorta = new Date(event.date).toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: 'numeric',
        month: 'short'
      });

      return {
        id: event.id,
        jornada: competition.week?.number || null,
        equipoLocal: {
          nombre: homeTeam.team.displayName,
          abreviacion: homeTeam.team.abbreviation,
          escudo: homeTeam.team.logo || null,
          color: homeTeam.team.color ? `#${homeTeam.team.color}` : null,
          record: homeTeam.records?.[0]?.summary || null
        },
        equipoVisitante: {
          nombre: awayTeam.team.displayName,
          abreviacion: awayTeam.team.abbreviation,
          escudo: awayTeam.team.logo || null,
          color: awayTeam.team.color ? `#${awayTeam.team.color}` : null,
          record: awayTeam.records?.[0]?.summary || null
        },
        fecha: fechaCorta,
        hora: horaLocal,
        fechaCompleta: fechaLocal,
        fechaISO: event.date,
        contador: calcularContador(event.date),
        estado: mapearEstado(statusName),
        estadoTipo: statusName,
        esEnVivo,
        resultado,
        estadio: competition.venue?.fullName || 'Por confirmar',
        ciudad: competition.venue?.address?.city || null,
        canalesTV,
        fuente: 'ESPN'
      };
    });

    return {
      actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
      total: partidos.length,
      jornadasTotales: 17,
      liga: "Liga MX",
      pais: "México",
      fuente: "ESPN",
      calendario: partidos
    };
  } catch (error) {
    console.error("Error scraping calendario:", error.message);
    throw error;
  }
}

module.exports = { scrapCalendario };

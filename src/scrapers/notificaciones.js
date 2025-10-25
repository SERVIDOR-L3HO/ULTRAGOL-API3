const cache = require("../cache/dataCache");

const LOGO_NOTIFICACIONES = "https://ultragol-l3ho.com.mx/attached_assets/1001721720-removebg-preview_1759201879566.png";

/**
 * Genera notificaciones inteligentes basadas en el estado de los partidos
 * @param {string} liga - Nombre de la liga ('ligamx', 'premier', 'laliga', 'seriea', 'bundesliga', 'ligue1')
 * @returns {Array} Array de notificaciones
 */
function generarNotificaciones(liga = 'todas') {
  const notificaciones = [];
  const ahora = new Date();
  
  // Mapeo de ligas
  const ligas = liga === 'todas' 
    ? ['ligamx', 'premier', 'laliga', 'seriea', 'bundesliga', 'ligue1']
    : [liga];
  
  const ligasNombres = {
    'ligamx': 'Liga MX',
    'premier': 'Premier League',
    'laliga': 'La Liga',
    'seriea': 'Serie A',
    'bundesliga': 'Bundesliga',
    'ligue1': 'Ligue 1'
  };
  
  ligas.forEach(ligaKey => {
    const ligaNombre = ligasNombres[ligaKey];
    
    // Obtener marcadores (partidos en vivo y recientes)
    const marcadoresKey = ligaKey === 'ligamx' ? 'marcadores' : `marcadores${ligaKey}`;
    const marcadores = cache.get(marcadoresKey);
    
    if (marcadores && marcadores.partidos) {
      marcadores.partidos.forEach(partido => {
        const fechaPartido = new Date(partido.fechaISO);
        const diferenciaMinutos = (fechaPartido - ahora) / (1000 * 60);
        
        // Partido EN VIVO
        if (partido.estado.enVivo) {
          notificaciones.push({
            id: `live-${partido.id}`,
            tipo: 'en_vivo',
            prioridad: 'alta',
            titulo: '🔴 PARTIDO EN VIVO',
            mensaje: `${partido.local.nombre} ${partido.local.marcador} - ${partido.visitante.marcador} ${partido.visitante.nombre}`,
            detalles: {
              liga: ligaNombre,
              periodo: partido.periodo,
              reloj: partido.reloj,
              estadio: partido.detalles.estadio,
              local: {
                nombre: partido.local.nombre,
                logo: partido.local.logo,
                marcador: partido.local.marcador,
                goles: partido.local.goles
              },
              visitante: {
                nombre: partido.visitante.nombre,
                logo: partido.visitante.logo,
                marcador: partido.visitante.marcador,
                goles: partido.visitante.goles
              }
            },
            icono: LOGO_NOTIFICACIONES,
            timestamp: ahora.toISOString(),
            accion: {
              texto: 'Ver partido en vivo',
              url: `/marcadores/${ligaKey}`
            }
          });
        }
        
        // Partido próximo a iniciar (dentro de 2 horas)
        else if (partido.estado.programado && diferenciaMinutos > 0 && diferenciaMinutos <= 120) {
          let tipoNotificacion = 'proximo';
          let emoji = '⏰';
          let mensajeTiempo = '';
          
          if (diferenciaMinutos <= 15) {
            tipoNotificacion = 'inicia_muy_pronto';
            emoji = '🚨';
            mensajeTiempo = 'inicia en menos de 15 minutos';
          } else if (diferenciaMinutos <= 30) {
            tipoNotificacion = 'inicia_pronto';
            emoji = '⚡';
            mensajeTiempo = 'inicia en 30 minutos';
          } else if (diferenciaMinutos <= 60) {
            tipoNotificacion = 'inicia_1h';
            emoji = '⏳';
            mensajeTiempo = 'inicia en 1 hora';
          } else {
            emoji = '📅';
            mensajeTiempo = `inicia en ${Math.round(diferenciaMinutos)} minutos`;
          }
          
          notificaciones.push({
            id: `upcoming-${partido.id}`,
            tipo: tipoNotificacion,
            prioridad: diferenciaMinutos <= 30 ? 'alta' : 'media',
            titulo: `${emoji} PARTIDO PRÓXIMO`,
            mensaje: `${partido.local.nombre} vs ${partido.visitante.nombre} ${mensajeTiempo}`,
            detalles: {
              liga: ligaNombre,
              fecha: partido.fecha,
              estadio: partido.detalles.estadio,
              minutosParaInicio: Math.round(diferenciaMinutos),
              local: {
                nombre: partido.local.nombre,
                logo: partido.local.logo
              },
              visitante: {
                nombre: partido.visitante.nombre,
                logo: partido.visitante.logo
              },
              transmisiones: partido.detalles.transmisiones
            },
            icono: LOGO_NOTIFICACIONES,
            timestamp: ahora.toISOString(),
            accion: {
              texto: 'Ver detalles del partido',
              url: `/calendario/${ligaKey}`
            }
          });
        }
      });
    }
    
    // Obtener calendario (para partidos próximos del día)
    const calendarioKey = ligaKey === 'ligamx' ? 'calendario' : `calendario${ligaKey}`;
    const calendario = cache.get(calendarioKey);
    
    if (calendario && calendario.length > 0) {
      // Filtrar partidos de hoy que aún no han comenzado
      const partidosHoy = calendario.filter(partido => {
        if (!partido.fechaISO) return false;
        
        const fechaPartido = new Date(partido.fechaISO);
        const esHoy = fechaPartido.toDateString() === ahora.toDateString();
        const noHaEmpezado = fechaPartido > ahora;
        const dentroDeHoy = (fechaPartido - ahora) / (1000 * 60 * 60) <= 24;
        
        return esHoy && noHaEmpezado && dentroDeHoy;
      });
      
      // Agregar notificación de partidos del día (solo si hay partidos)
      if (partidosHoy.length > 0) {
        const primerPartido = partidosHoy.sort((a, b) => 
          new Date(a.fechaISO) - new Date(b.fechaISO)
        )[0];
        
        const fechaPrimerPartido = new Date(primerPartido.fechaISO);
        const minutosParaPrimero = (fechaPrimerPartido - ahora) / (1000 * 60);
        
        // Solo mostrar si el primer partido es en más de 2 horas (para no duplicar con notificaciones de "próximo")
        if (minutosParaPrimero > 120) {
          notificaciones.push({
            id: `today-${ligaKey}`,
            tipo: 'partidos_hoy',
            prioridad: 'baja',
            titulo: '📅 PARTIDOS DE HOY',
            mensaje: `${partidosHoy.length} partido${partidosHoy.length > 1 ? 's' : ''} de ${ligaNombre} hoy`,
            detalles: {
              liga: ligaNombre,
              total: partidosHoy.length,
              primerPartido: {
                local: primerPartido.equipoLocal.nombre,
                visitante: primerPartido.equipoVisitante.nombre,
                hora: primerPartido.hora
              },
              partidos: partidosHoy.map(p => ({
                local: p.equipoLocal.nombre,
                logoLocal: p.equipoLocal.escudo,
                visitante: p.equipoVisitante.nombre,
                logoVisitante: p.equipoVisitante.escudo,
                hora: p.hora
              }))
            },
            icono: LOGO_NOTIFICACIONES,
            timestamp: ahora.toISOString(),
            accion: {
              texto: 'Ver calendario completo',
              url: `/calendario/${ligaKey}`
            }
          });
        }
      }
    }
  });
  
  // Ordenar notificaciones por prioridad
  const prioridadOrden = { 'alta': 1, 'media': 2, 'baja': 3 };
  notificaciones.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);
  
  return notificaciones;
}

/**
 * Genera estadísticas de notificaciones
 */
function obtenerEstadisticasNotificaciones() {
  const notificaciones = generarNotificaciones('todas');
  
  return {
    total: notificaciones.length,
    porTipo: {
      enVivo: notificaciones.filter(n => n.tipo === 'en_vivo').length,
      iniciaMuyPronto: notificaciones.filter(n => n.tipo === 'inicia_muy_pronto').length,
      iniciaPronto: notificaciones.filter(n => n.tipo === 'inicia_pronto').length,
      inicia1h: notificaciones.filter(n => n.tipo === 'inicia_1h').length,
      proximo: notificaciones.filter(n => n.tipo === 'proximo').length,
      partidosHoy: notificaciones.filter(n => n.tipo === 'partidos_hoy').length
    },
    porPrioridad: {
      alta: notificaciones.filter(n => n.prioridad === 'alta').length,
      media: notificaciones.filter(n => n.prioridad === 'media').length,
      baja: notificaciones.filter(n => n.prioridad === 'baja').length
    }
  };
}

module.exports = {
  generarNotificaciones,
  obtenerEstadisticasNotificaciones
};

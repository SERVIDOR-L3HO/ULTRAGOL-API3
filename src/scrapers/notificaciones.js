const cache = require("../cache/dataCache");

const LOGO_NOTIFICACIONES = "https://ultragol-l3ho.com.mx/attached_assets/1001721720-removebg-preview_1759201879566.png";

/**
 * Compara estados de partidos para detectar eventos (goles, cambios de periodo)
 * @param {Object} partidoActual - Estado actual del partido
 * @param {Object} partidoAnterior - Estado anterior del partido (puede ser null)
 * @returns {Array} Array de eventos detectados
 */
function detectarEventos(partidoActual, partidoAnterior) {
  const eventos = [];
  
  if (!partidoAnterior) return eventos;
  
  // Detectar goles nuevos
  const golesActuales = partidoActual.goles || [];
  const golesAnteriores = partidoAnterior.goles || [];
  
  if (golesActuales.length > golesAnteriores.length) {
    const golesNuevos = golesActuales.slice(golesAnteriores.length);
    golesNuevos.forEach(gol => {
      eventos.push({
        tipo: 'gol',
        datos: {
          partido: partidoActual,
          gol: gol
        }
      });
    });
  }
  
  // Detectar inicio del partido (cambio de programado a en vivo)
  if (partidoAnterior.estado.programado && partidoActual.estado.enVivo && partidoActual.periodo === 1) {
    eventos.push({
      tipo: 'inicio_partido',
      datos: {
        partido: partidoActual
      }
    });
  }
  
  // Detectar fin del primer tiempo (cambio de periodo 1 a 2, o estado de medio tiempo)
  if (partidoAnterior.periodo === 1 && (partidoActual.periodo === 2 || partidoActual.estado.tipo === 'STATUS_HALFTIME')) {
    eventos.push({
      tipo: 'fin_primer_tiempo',
      datos: {
        partido: partidoActual,
        marcadorLocal: partidoActual.local.marcador,
        marcadorVisitante: partidoActual.visitante.marcador
      }
    });
  }
  
  // Detectar inicio del segundo tiempo
  if (partidoAnterior.periodo === 1 && partidoActual.periodo === 2 && partidoAnterior.estado.tipo !== partidoActual.estado.tipo) {
    eventos.push({
      tipo: 'inicio_segundo_tiempo',
      datos: {
        partido: partidoActual
      }
    });
  }
  
  return eventos;
}

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
    
    // Obtener marcadores anteriores para detectar eventos
    const marcadoresAnterioresKey = `${marcadoresKey}_anterior`;
    const marcadoresAnteriores = cache.get(marcadoresAnterioresKey) || { partidos: [] };
    
    if (marcadores && marcadores.partidos) {
      marcadores.partidos.forEach(partido => {
        // Buscar el estado anterior del partido
        const partidoAnterior = marcadoresAnteriores.partidos.find(p => p.id === partido.id);
        
        // Detectar eventos (goles, cambios de periodo)
        const eventos = detectarEventos(partido, partidoAnterior);
        
        // Generar notificaciones para cada evento detectado
        eventos.forEach(evento => {
          switch (evento.tipo) {
            case 'gol':
              const gol = evento.datos.gol;
              const equipoGoleador = partido.local.goles.includes(gol) ? partido.local : partido.visitante;
              notificaciones.push({
                id: `gol-${partido.id}-${Date.now()}`,
                tipo: 'gol',
                prioridad: 'alta',
                titulo: `⚽ ¡GOOOOOOL! ${equipoGoleador.nombre}`,
                mensaje: `${gol.goleador} marca para ${gol.equipo} en el minuto ${gol.minuto}`,
                detalles: {
                  liga: ligaNombre,
                  partido: {
                    local: partido.local.nombre,
                    logoLocal: partido.local.logo,
                    marcadorLocal: partido.local.marcador,
                    visitante: partido.visitante.nombre,
                    logoVisitante: partido.visitante.logo,
                    marcadorVisitante: partido.visitante.marcador
                  },
                  gol: {
                    goleador: gol.goleador,
                    equipo: gol.equipo,
                    minuto: gol.minuto,
                    tipo: gol.tipoGol,
                    descripcion: gol.descripcion
                  },
                  periodo: partido.periodo,
                  reloj: partido.reloj
                },
                icono: equipoGoleador.logo || LOGO_NOTIFICACIONES,
                timestamp: ahora.toISOString(),
                accion: {
                  texto: 'Ver partido en vivo',
                  url: `/marcadores/${ligaKey}`
                }
              });
              break;
              
            case 'inicio_partido':
              notificaciones.push({
                id: `inicio-${partido.id}`,
                tipo: 'inicio_partido',
                prioridad: 'alta',
                titulo: `🏁 ¡COMENZÓ EL PARTIDO!`,
                mensaje: `${partido.local.nombre} vs ${partido.visitante.nombre}`,
                detalles: {
                  liga: ligaNombre,
                  local: {
                    nombre: partido.local.nombre,
                    logo: partido.local.logo
                  },
                  visitante: {
                    nombre: partido.visitante.nombre,
                    logo: partido.visitante.logo
                  },
                  estadio: partido.detalles.estadio
                },
                icono: LOGO_NOTIFICACIONES,
                timestamp: ahora.toISOString(),
                accion: {
                  texto: 'Ver partido en vivo',
                  url: `/marcadores/${ligaKey}`
                }
              });
              break;
              
            case 'fin_primer_tiempo':
              notificaciones.push({
                id: `ht-${partido.id}`,
                tipo: 'fin_primer_tiempo',
                prioridad: 'media',
                titulo: `⏸️ FIN DEL PRIMER TIEMPO`,
                mensaje: `${partido.local.nombre} ${evento.datos.marcadorLocal} - ${evento.datos.marcadorVisitante} ${partido.visitante.nombre}`,
                detalles: {
                  liga: ligaNombre,
                  partido: {
                    local: partido.local.nombre,
                    logoLocal: partido.local.logo,
                    marcadorLocal: evento.datos.marcadorLocal,
                    visitante: partido.visitante.nombre,
                    logoVisitante: partido.visitante.logo,
                    marcadorVisitante: evento.datos.marcadorVisitante
                  },
                  estadio: partido.detalles.estadio
                },
                icono: LOGO_NOTIFICACIONES,
                timestamp: ahora.toISOString(),
                accion: {
                  texto: 'Ver estadísticas del partido',
                  url: `/marcadores/${ligaKey}`
                }
              });
              break;
              
            case 'inicio_segundo_tiempo':
              notificaciones.push({
                id: `st-${partido.id}`,
                tipo: 'inicio_segundo_tiempo',
                prioridad: 'media',
                titulo: `▶️ SEGUNDO TIEMPO EN MARCHA`,
                mensaje: `${partido.local.nombre} vs ${partido.visitante.nombre}`,
                detalles: {
                  liga: ligaNombre,
                  partido: {
                    local: partido.local.nombre,
                    logoLocal: partido.local.logo,
                    marcadorLocal: partido.local.marcador,
                    visitante: partido.visitante.nombre,
                    logoVisitante: partido.visitante.logo,
                    marcadorVisitante: partido.visitante.marcador
                  }
                },
                icono: LOGO_NOTIFICACIONES,
                timestamp: ahora.toISOString(),
                accion: {
                  texto: 'Ver partido en vivo',
                  url: `/marcadores/${ligaKey}`
                }
              });
              break;
          }
        });
        
        // Continuar con las notificaciones normales
        const fechaPartido = new Date(partido.fechaISO);
        const diferenciaMinutos = (fechaPartido - ahora) / (1000 * 60);
        
        // Partido EN VIVO
        if (partido.estado.enVivo) {
          notificaciones.push({
            id: `live-${partido.id}`,
            tipo: 'en_vivo',
            prioridad: 'alta',
            titulo: `🔴 ${partido.local.nombre} vs ${partido.visitante.nombre} - EN VIVO`,
            mensaje: `¡${partido.local.nombre} y ${partido.visitante.nombre} están jugando AHORA en ULTRAGOL! Marcador: ${partido.local.marcador} - ${partido.visitante.marcador}`,
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
              texto: 'Ver partido en vivo en ULTRAGOL',
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
      gol: notificaciones.filter(n => n.tipo === 'gol').length,
      inicioPartido: notificaciones.filter(n => n.tipo === 'inicio_partido').length,
      finPrimerTiempo: notificaciones.filter(n => n.tipo === 'fin_primer_tiempo').length,
      inicioSegundoTiempo: notificaciones.filter(n => n.tipo === 'inicio_segundo_tiempo').length,
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

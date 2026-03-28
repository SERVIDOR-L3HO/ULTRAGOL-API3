const axios = require("axios");

const PROXY = "https://ultragol-api-3.vercel.app/ultragol-l3ho?get=";

const categoriaMap = {
  'football': 'Fútbol',
  'basketball': 'Baloncesto',
  'tennis': 'Tenis',
  'handball': 'Balonmano',
  'hockey': 'Hockey',
  'volleyball': 'Voleibol',
  'baseball': 'Béisbol',
  'boxing': 'Boxeo',
  'mma': 'MMA',
  'ufc': 'UFC',
  'american-football': 'Fútbol Americano',
  'rugby': 'Rugby',
  'cricket': 'Cricket',
  'golf': 'Golf',
  'motorsport': 'Automovilismo',
  'f1': 'Fórmula 1',
  'cycling': 'Ciclismo',
  'motor-sports': 'Automovilismo',
  'fight': 'Combate',
  'afl': 'Fútbol Australiano',
  'other': 'Otros',
  'esports': 'E-Sports',
  'darts': 'Dardos',
  'snooker': 'Snooker',
  'lacrosse': 'Lacrosse',
  'swimming': 'Natación',
  'athletics': 'Atletismo'
};

async function scrapTransmisiones6() {
  const startTime = Date.now();

  try {
    console.log("🔄 Obteniendo transmisiones desde streamed.pk...");

    const response = await axios.get("https://streamed.pk/api/matches/all", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://cmrroto01.blogspot.com/p/agenda-streamed.html?m=1"
      },
      timeout: 15000
    });

    const eventos = response.data || [];
    const now = new Date();

    const transmisiones = eventos
      .filter(event => event.date !== 0)
      .map(event => {
        const fecha = new Date(event.date);
        const diffMs = fecha.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        let estado = "Programado";
        if (diffMins <= 0 && diffMins > -180) {
          estado = "En vivo";
        } else if (diffMins > 0 && diffMins <= 30) {
          estado = "Por comenzar";
        } else if (diffMins <= -180) {
          estado = "Finalizado";
        }

        const deporte = categoriaMap[event.category?.toLowerCase()] || event.category || "Otro";

        const horaLocal = fecha.toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const fechaLocal = fecha.toLocaleDateString('es-MX', {
          timeZone: 'America/Mexico_City',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        return {
          id: event.id,
          titulo: event.title,
          evento: event.title,
          categoria: event.category,
          deporte,
          hora: horaLocal,
          fecha: fechaLocal,
          fechaISO: fecha.toISOString(),
          estado,
          popular: event.popular || false,
          equipo1: event.teams?.home?.name || null,
          equipo2: event.teams?.away?.name || null,
          fuentes: (event.sources || []).map(s => ({
            fuente: s.source,
            id: s.id,
            url: `${PROXY}https://embedsports.top/embed/${s.source}/${s.id}/1&useplayer&m=1`
          })),
          fuente: "streamed.pk"
        };
      });

    const deportes = {};
    transmisiones.forEach(t => {
      if (!deportes[t.deporte]) deportes[t.deporte] = 0;
      deportes[t.deporte]++;
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`📺 Transmisiones6 (streamed.pk) procesadas: ${transmisiones.length} en ${elapsedTime}ms`);

    const enVivo = transmisiones.filter(t => t.estado === "En vivo").length;
    const proximos = transmisiones.filter(t => t.estado !== "En vivo" && t.estado !== "Finalizado").length;

    return {
      total: transmisiones.length,
      enVivo,
      proximos,
      actualizado: new Date().toISOString(),
      fuente: "streamed.pk",
      referencia: "https://cmrroto01.blogspot.com/p/agenda-streamed.html?m=1",
      deportes,
      deportesDisponibles: Object.keys(deportes),
      elapsedTime: `${elapsedTime}ms`,
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones6:", error.message);

    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "streamed.pk",
      referencia: "https://cmrroto01.blogspot.com/p/agenda-streamed.html?m=1",
      error: `Error obteniendo transmisiones: ${error.message}`,
      deportes: {},
      deportesDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones6 };

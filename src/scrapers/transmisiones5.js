const axios = require("axios");

async function getScheduleData(scheduleId = null) {
  try {
    const url = scheduleId 
      ? `https://donromans.com/wp-json/wp/v2/schedule/${scheduleId}`
      : 'https://donromans.com/wp-json/wp/v2/schedule?per_page=100&orderby=id&order=asc';
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo schedule data ${scheduleId ? `(ID: ${scheduleId})` : ''}:`, error.message);
    throw error;
  }
}

function applyGolazoProxy(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('golazotvhd.com')) return url;
  return `https://golazotvhd.com/evento.html?get=${url}`;
}

function processLinkData(data) {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return applyGolazoProxy(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => processLinkData(item));
  }
  
  if (typeof data === 'object') {
    const processed = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        processed[key] = applyGolazoProxy(value);
      } else if (typeof value === 'object') {
        processed[key] = processLinkData(value);
      } else {
        processed[key] = value;
      }
    }
    return processed;
  }
  
  return data;
}

async function extractStreamingLinks(event) {
  const streamingInfo = {
    eventId: event.id,
    eventTitle: event.title?.rendered || 'Unknown',
    matches: []
  };

  if (event.acf && event.acf.lista_de_eventos) {
    event.acf.lista_de_eventos.forEach((match, index) => {
      const matchInfo = {
        index: index,
        league: match.match_league || 'Sin liga',
        title: match.match_title || 'Sin título',
        hour: match.match_hour || 'Sin horario',
        country_flag: match.country_flag || null,
        is_replay: match.is_replay || false,
        compatibility: match.compatibility || null,
        links: []
      };

      if (match.urls_list && match.urls_list !== null) {
        matchInfo.links.push({
          type: 'urls_list',
          data: processLinkData(match.urls_list)
        });
      }

      if (match.SpecialLinks && match.SpecialLinks !== null) {
        matchInfo.links.push({
          type: 'SpecialLinks',
          data: processLinkData(match.SpecialLinks)
        });
      }

      const linkFields = ['channels', 'servers', 'enlaces', 'links', 'streams'];
      linkFields.forEach(field => {
        if (match[field] && match[field] !== null) {
          matchInfo.links.push({
            type: field,
            data: processLinkData(match[field])
          });
        }
      });

      streamingInfo.matches.push(matchInfo);
    });
  }

  return streamingInfo;
}

async function scrapTransmisiones5() {
  const startTime = Date.now();
  
  try {
    console.log("🔄 Obteniendo transmisiones EN TIEMPO REAL desde donromans.com API...");
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Buscando eventos del día: ${today}`);
    
    const url = 'https://donromans.com/wp-json/wp/v2/schedule?per_page=20&orderby=id&order=desc';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const schedules = response.data;
    console.log(`📊 Total de eventos disponibles: ${schedules.length}`);
    
    const todayEvent = schedules.find(event => event.title?.rendered === today);
    
    if (!todayEvent) {
      console.log(`⚠️ No se encontró evento para hoy (${today}). Eventos disponibles:`, 
        schedules.slice(0, 5).map(e => e.title?.rendered));
      
      return {
        success: false,
        source: "donromans.com API",
        timestamp: new Date().toISOString(),
        eventDate: today,
        error: `No hay eventos programados para hoy (${today})`,
        totalMatches: 0,
        matches: []
      };
    }
    
    console.log(`✅ Evento de hoy encontrado: ID ${todayEvent.id}`);
    
    const fullEvent = await getScheduleData(todayEvent.id);
    const streamingData = await extractStreamingLinks(fullEvent);
    
    const validMatches = streamingData.matches.filter(m => m.links.length > 0);
    
    const elapsedTime = Date.now() - startTime;
    
    console.log(`✅ Transmisiones5 EN VIVO: ${validMatches.length} partidos de hoy con enlaces en ${elapsedTime}ms`);
    
    return {
      success: true,
      source: "donromans.com API",
      timestamp: new Date().toISOString(),
      eventDate: today,
      totalMatches: validMatches.length,
      elapsedTime: `${elapsedTime}ms`,
      matches: validMatches
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones5:", error.message);
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      success: false,
      source: "donromans.com API",
      timestamp: new Date().toISOString(),
      eventDate: today,
      error: error.message,
      totalMatches: 0,
      matches: []
    };
  }
}

module.exports = { scrapTransmisiones5, getScheduleData, extractStreamingLinks };

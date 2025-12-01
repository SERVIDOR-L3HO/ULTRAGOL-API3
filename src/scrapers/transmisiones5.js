const axios = require("axios");

const GLZ_PROXY = "https://glzdeportes.com/glz.php?get=";

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
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return GLZ_PROXY + encodeURIComponent(url);
  }
  return url;
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
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Buscando eventos del día: ${today} o ${yesterday}`);
    
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
    const yesterdayEvent = schedules.find(event => event.title?.rendered === yesterday);
    
    const eventsToProcess = [];
    if (todayEvent) eventsToProcess.push({ event: todayEvent, date: today });
    if (yesterdayEvent) eventsToProcess.push({ event: yesterdayEvent, date: yesterday });
    
    if (eventsToProcess.length === 0) {
      const validEvents = schedules.filter(e => e.title?.rendered !== 'REPETICIONES');
      if (validEvents.length > 0) {
        eventsToProcess.push({ 
          event: validEvents[0], 
          date: validEvents[0].title?.rendered || today 
        });
      }
    }
    
    if (eventsToProcess.length === 0) {
      console.log(`❌ No se encontraron eventos válidos. Eventos disponibles:`, 
        schedules.slice(0, 5).map(e => e.title?.rendered));
      
      return {
        success: false,
        source: "donromans.com API",
        timestamp: new Date().toISOString(),
        eventDate: today,
        error: `No hay eventos programados disponibles`,
        totalMatches: 0,
        matches: []
      };
    }
    
    console.log(`✅ Procesando ${eventsToProcess.length} eventos: ${eventsToProcess.map(e => e.date).join(', ')}`);
    
    let allMatches = [];
    const processedEvents = [];
    
    for (const { event, date } of eventsToProcess) {
      const fullEvent = await getScheduleData(event.id);
      const streamingData = await extractStreamingLinks(fullEvent);
      
      streamingData.matches.forEach(match => {
        match.eventDate = date;
      });
      
      allMatches = allMatches.concat(streamingData.matches);
      processedEvents.push(date);
    }
    
    const matchesWithLinks = allMatches.filter(m => m.links.length > 0).length;
    
    const elapsedTime = Date.now() - startTime;
    
    console.log(`✅ Transmisiones5 EN VIVO: ${allMatches.length} partidos totales, ${matchesWithLinks} con enlaces en ${elapsedTime}ms`);
    
    return {
      success: true,
      source: "donromans.com API",
      timestamp: new Date().toISOString(),
      eventsProcessed: processedEvents,
      totalMatches: allMatches.length,
      matchesWithLinks: matchesWithLinks,
      elapsedTime: `${elapsedTime}ms`,
      matches: allMatches
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

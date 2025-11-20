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
          data: match.urls_list
        });
      }

      if (match.SpecialLinks && match.SpecialLinks !== null) {
        matchInfo.links.push({
          type: 'SpecialLinks',
          data: match.SpecialLinks
        });
      }

      const linkFields = ['channels', 'servers', 'enlaces', 'links', 'streams'];
      linkFields.forEach(field => {
        if (match[field] && match[field] !== null) {
          matchInfo.links.push({
            type: field,
            data: match[field]
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
    console.log("🔄 Obteniendo transmisiones desde donromans.com API...");
    
    const schedules = await getScheduleData();
    console.log(`📅 Total de eventos encontrados: ${schedules.length}`);
    
    const allStreamingData = [];
    let totalMatches = 0;
    let matchesWithLinks = 0;

    for (const schedule of schedules) {
      try {
        const fullEvent = await getScheduleData(schedule.id);
        const streamingData = await extractStreamingLinks(fullEvent);
        
        const validMatches = streamingData.matches.filter(m => m.links.length > 0);
        
        if (validMatches.length > 0) {
          allStreamingData.push({
            eventId: streamingData.eventId,
            eventTitle: streamingData.eventTitle,
            totalMatches: validMatches.length,
            matches: validMatches
          });
          matchesWithLinks += validMatches.length;
        }
        
        totalMatches += streamingData.matches.length;
        
      } catch (eventError) {
        console.error(`Error procesando evento ${schedule.id}:`, eventError.message);
      }
    }

    const elapsedTime = Date.now() - startTime;
    
    console.log(`✅ Transmisiones5 obtenidas: ${allStreamingData.length} eventos, ${matchesWithLinks}/${totalMatches} partidos con enlaces en ${elapsedTime}ms`);
    
    return {
      success: true,
      source: "donromans.com API",
      timestamp: new Date().toISOString(),
      totalEvents: allStreamingData.length,
      totalMatches: matchesWithLinks,
      elapsedTime: `${elapsedTime}ms`,
      events: allStreamingData
    };
    
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones5:", error.message);
    
    return {
      success: false,
      source: "donromans.com API",
      timestamp: new Date().toISOString(),
      error: error.message,
      events: []
    };
  }
}

module.exports = { scrapTransmisiones5, getScheduleData, extractStreamingLinks };

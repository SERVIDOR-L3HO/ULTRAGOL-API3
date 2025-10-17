const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    // Buscar en resultados recientes
    const response = await axios.get('https://www.espn.com.mx/futbol/resultados/_/liga/mex.1');
    const $ = cheerio.load(response.data);
    
    console.log('=== ESTRUCTURA DE RESULTADOS ESPN ===\n');
    
    $('.ScheduleTables table tbody tr').slice(0, 2).each((i, row) => {
      console.log(`\n=== PARTIDO ${i + 1} ===`);
      $(row).find('td').each((idx, td) => {
        const texto = $(td).text().trim();
        const clase = $(td).attr('class');
        console.log(`Col ${idx} (${clase}): ${texto}`);
        
        // Buscar marcadores
        const score = $(td).find('.score');
        if (score.length > 0) {
          console.log(`  MARCADOR: ${score.text()}`);
        }
        
        // Buscar ganador
        if ($(td).hasClass('winner') || $(td).find('.winner').length > 0) {
          console.log(`  *** GANADOR ***`);
        }
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

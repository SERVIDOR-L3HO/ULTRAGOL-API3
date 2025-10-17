const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const response = await axios.get('https://www.espn.com.mx/futbol/calendario/_/liga/mex.1');
    const $ = cheerio.load(response.data);
    
    console.log('=== ESTRUCTURA DE CALENDARIO ESPN ===\n');
    
    $('.ScheduleTables').children().each((i, el) => {
      if ($(el).hasClass('ResponsiveTable') || $(el).hasClass('Table')) {
        const primeraFila = $(el).find('tbody tr').first();
        console.log('\n=== PRIMERA FILA ===');
        primeraFila.find('td').each((idx, td) => {
          console.log(`\nColumna ${idx}:`);
          console.log(`  Texto: ${$(td).text().trim()}`);
          console.log(`  Classes: ${$(td).attr('class')}`);
          
          // Buscar enlaces
          const links = $(td).find('a');
          if (links.length > 0) {
            console.log(`  Enlaces encontrados: ${links.length}`);
            links.each((li, link) => {
              console.log(`    - ${$(link).text().trim()} -> ${$(link).attr('href')}`);
            });
          }
          
          // Buscar imágenes
          const imgs = $(td).find('img');
          if (imgs.length > 0) {
            console.log(`  Imágenes: ${imgs.length}`);
            imgs.each((ii, img) => {
              console.log(`    - ${$(img).attr('alt')} -> ${$(img).attr('src')}`);
            });
          }
        });
        return false; // Solo la primera tabla
      }
    });
    
    // También investigar si hay información de resultados
    console.log('\n\n=== BUSCANDO PARTIDOS CON RESULTADOS ===');
    $('.ScheduleTables table tbody tr').slice(0, 3).each((i, row) => {
      console.log(`\nFila ${i}:`);
      $(row).find('td').each((idx, td) => {
        console.log(`  Col ${idx}: ${$(td).text().trim()}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

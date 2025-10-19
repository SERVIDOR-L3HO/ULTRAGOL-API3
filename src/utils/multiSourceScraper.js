async function tryMultipleSources(sources, options = {}) {
  const {
    logger = console,
    selectBestBy = 'first',
    minFreshnessMinutes = 60
  } = options;

  const results = [];
  const errors = [];

  for (const source of sources) {
    try {
      logger.log(`🔄 Intentando fuente: ${source.name}...`);
      
      const startTime = Date.now();
      const data = await source.scraper();
      const duration = Date.now() - startTime;

      if (!data || !data.tabla || data.tabla.length === 0) {
        throw new Error('Datos vacíos o inválidos');
      }

      const result = {
        ...data,
        fuente: source.name,
        fuente_url: source.url,
        tiempo_scraping_ms: duration,
        timestamp: new Date().toISOString()
      };

      if (data.actualizadoISO) {
        const ageMinutes = (Date.now() - new Date(data.actualizadoISO).getTime()) / 60000;
        result.edad_datos_minutos = Math.round(ageMinutes);
        result.datos_frescos = ageMinutes < minFreshnessMinutes;
      }

      results.push(result);
      logger.log(`✅ Fuente ${source.name}: ${data.tabla.length} equipos obtenidos en ${duration}ms`);

      if (selectBestBy === 'first') {
        logger.log(`📊 Usando primera fuente exitosa: ${source.name}`);
        return result;
      }

    } catch (error) {
      logger.error(`❌ Error en fuente ${source.name}: ${error.message}`);
      errors.push({
        source: source.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  if (results.length === 0) {
    throw new Error(`Todas las fuentes fallaron. Errores: ${JSON.stringify(errors)}`);
  }

  const bestResult = selectBestResult(results, selectBestBy);
  console.log(`📊 Mejor fuente seleccionada: ${bestResult.fuente}`);
  
  return {
    ...bestResult,
    fuentes_intentadas: results.length + errors.length,
    fuentes_exitosas: results.length,
    fuentes_fallidas: errors.length
  };
}

function selectBestResult(results, strategy) {
  if (results.length === 1) return results[0];

  switch (strategy) {
    case 'first':
      return results[0];
    
    case 'freshest':
      return results.reduce((best, current) => {
        if (!current.actualizadoISO) return best;
        if (!best.actualizadoISO) return current;
        
        const currentTime = new Date(current.actualizadoISO).getTime();
        const bestTime = new Date(best.actualizadoISO).getTime();
        
        return currentTime > bestTime ? current : best;
      });
    
    case 'fastest':
      return results.reduce((best, current) => 
        current.tiempo_scraping_ms < best.tiempo_scraping_ms ? current : best
      );
    
    case 'most_complete':
      return results.reduce((best, current) => 
        current.tabla.length > best.tabla.length ? current : best
      );
    
    default:
      return results[0];
  }
}

function normalizeTablaData(rawData, sourceName) {
  const baseData = {
    actualizado: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    actualizadoISO: new Date().toISOString(),
    total: 0,
    tabla: []
  };

  if (!rawData || !rawData.tabla) {
    return baseData;
  }

  return {
    ...baseData,
    ...rawData,
    fuente: sourceName
  };
}

module.exports = {
  tryMultipleSources,
  selectBestResult,
  normalizeTablaData
};

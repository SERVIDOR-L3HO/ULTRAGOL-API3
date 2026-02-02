const axios = require("axios");

const IPTV_API_BASE = "https://iptv-org.github.io/api";

async function scrapCanales() {
  console.log("📺 Obteniendo canales de transmisión desde IPTV-org...");
  
  try {
    const [channelsRes, streamsRes, countriesRes] = await Promise.all([
      axios.get(`${IPTV_API_BASE}/channels.json`, { timeout: 30000 }),
      axios.get(`${IPTV_API_BASE}/streams.json`, { timeout: 30000 }),
      axios.get(`${IPTV_API_BASE}/countries.json`, { timeout: 30000 })
    ]);
    
    const channels = channelsRes.data;
    const streams = streamsRes.data;
    const countries = countriesRes.data;
    
    const countriesMap = {};
    countries.forEach(country => {
      countriesMap[country.code] = {
        nombre: country.name,
        bandera: country.flag || null
      };
    });
    
    const streamsByChannel = {};
    streams.forEach(stream => {
      if (!streamsByChannel[stream.channel]) {
        streamsByChannel[stream.channel] = [];
      }
      streamsByChannel[stream.channel].push({
        url: stream.url,
        status: stream.status || "online"
      });
    });
    
    const canalesConLinks = channels
      .filter(channel => streamsByChannel[channel.id])
      .map(channel => {
        const countryInfo = countriesMap[channel.country] || { nombre: channel.country, bandera: null };
        return {
          id: channel.id,
          nombre: channel.name,
          pais: countryInfo.nombre,
          codigoPais: channel.country,
          bandera: countryInfo.bandera,
          idiomas: channel.languages || [],
          categorias: channel.categories || [],
          logo: channel.logo || null,
          website: channel.website || null,
          streams: streamsByChannel[channel.id]
        };
      });
    
    const canalesPorPais = {};
    canalesConLinks.forEach(canal => {
      const pais = canal.pais || "Desconocido";
      if (!canalesPorPais[pais]) {
        canalesPorPais[pais] = [];
      }
      canalesPorPais[pais].push(canal);
    });
    
    const canalesPorCategoria = {};
    canalesConLinks.forEach(canal => {
      canal.categorias.forEach(cat => {
        if (!canalesPorCategoria[cat]) {
          canalesPorCategoria[cat] = [];
        }
        canalesPorCategoria[cat].push(canal);
      });
    });
    
    console.log(`✅ Canales obtenidos: ${canalesConLinks.length} canales con streams activos`);
    
    return {
      success: true,
      fuente: "IPTV-org (famelack source)",
      totalCanales: canalesConLinks.length,
      totalPaises: Object.keys(canalesPorPais).length,
      categorias: Object.keys(canalesPorCategoria),
      canales: canalesConLinks,
      porPais: canalesPorPais,
      porCategoria: canalesPorCategoria,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error obteniendo canales:", error.message);
    return {
      success: false,
      error: error.message,
      canales: []
    };
  }
}

async function scrapCanalesPorPais(codigoPais) {
  console.log(`📺 Obteniendo canales del país: ${codigoPais}...`);
  
  try {
    const data = await scrapCanales();
    if (!data.success) return data;
    
    const canalesFiltrados = data.canales.filter(
      canal => canal.codigoPais && canal.codigoPais.toLowerCase() === codigoPais.toLowerCase()
    );
    
    return {
      success: true,
      pais: codigoPais.toUpperCase(),
      totalCanales: canalesFiltrados.length,
      canales: canalesFiltrados,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error obteniendo canales por país:", error.message);
    return {
      success: false,
      error: error.message,
      canales: []
    };
  }
}

async function scrapCanalesPorCategoria(categoria) {
  console.log(`📺 Obteniendo canales de categoría: ${categoria}...`);
  
  try {
    const data = await scrapCanales();
    if (!data.success) return data;
    
    const canalesFiltrados = data.canales.filter(
      canal => canal.categorias.some(cat => cat.toLowerCase() === categoria.toLowerCase())
    );
    
    return {
      success: true,
      categoria: categoria,
      totalCanales: canalesFiltrados.length,
      canales: canalesFiltrados,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error obteniendo canales por categoría:", error.message);
    return {
      success: false,
      error: error.message,
      canales: []
    };
  }
}

async function scrapCanalesDeportes() {
  console.log("⚽ Obteniendo canales deportivos...");
  return await scrapCanalesPorCategoria("sports");
}

module.exports = {
  scrapCanales,
  scrapCanalesPorPais,
  scrapCanalesPorCategoria,
  scrapCanalesDeportes
};

const axios = require("axios");

const IPTV_API_BASE = "https://iptv-org.github.io/api";
const PLUTO_API_BASE = "https://api.pluto.tv/v2";

const PLUTO_CLIENT_PARAMS = {
  appName: "web",
  appVersion: "na",
  clientID: "pluto-latam-api",
  clientModelNumber: "na",
  serverSideAds: "false",
  deviceMake: "unknown",
  deviceModel: "unknown",
  deviceType: "web",
  deviceVersion: "unknown"
};

const PLUTO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Origin": "https://pluto.tv",
  "Referer": "https://pluto.tv/"
};

function buildPlutoStreamUrl(channelId) {
  const params = new URLSearchParams({
    advertisingId: "",
    appName: "web",
    appVersion: "na",
    clientID: "pluto-latam-api",
    clientModelNumber: "na",
    deviceDNT: "false",
    deviceMake: "unknown",
    deviceModel: "unknown",
    deviceType: "web",
    deviceVersion: "unknown",
    serverSideAds: "false",
    sid: "pluto-latam-api"
  });
  return `https://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/${channelId}/master.m3u8?${params.toString()}`;
}

async function fetchPlutoTVCanales() {
  console.log("📺 Obteniendo canales de Pluto TV...");
  try {
    const res = await axios.get(`${PLUTO_API_BASE}/channels`, {
      params: PLUTO_CLIENT_PARAMS,
      headers: PLUTO_HEADERS,
      timeout: 30000
    });

    return res.data.map(ch => ({
      id: `pluto_${ch._id}`,
      nombre: ch.name,
      pais: "Internacional",
      codigoPais: "INT",
      bandera: null,
      idiomas: [],
      categorias: ch.category ? [ch.category] : [],
      logo: ch.logo?.path || null,
      website: `https://pluto.tv/latam/live-tv/${ch._id}`,
      fuente: "Pluto TV",
      streams: [
        {
          url: buildPlutoStreamUrl(ch._id),
          status: "online",
          tipo: "hls"
        }
      ],
      extra: {
        numero: ch.number || null,
        descripcion: ch.summary || null,
        thumbnail: ch.thumbnail?.path || null
      }
    }));
  } catch (error) {
    console.error("❌ Error obteniendo canales de Pluto TV:", error.message);
    return [];
  }
}

async function scrapCanales() {
  console.log("📺 Obteniendo canales de transmisión desde IPTV-org y Pluto TV...");
  
  try {
    const [channelsRes, streamsRes, countriesRes, plutoCanales] = await Promise.all([
      axios.get(`${IPTV_API_BASE}/channels.json`, { timeout: 30000 }),
      axios.get(`${IPTV_API_BASE}/streams.json`, { timeout: 30000 }),
      axios.get(`${IPTV_API_BASE}/countries.json`, { timeout: 30000 }),
      fetchPlutoTVCanales()
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
    
    const iptvCanales = channels
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
          fuente: "IPTV-org",
          streams: streamsByChannel[channel.id]
        };
      });

    const canalesConLinks = [...iptvCanales, ...plutoCanales];
    
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
    
    console.log(`✅ Canales obtenidos: ${iptvCanales.length} IPTV-org + ${plutoCanales.length} Pluto TV = ${canalesConLinks.length} total`);
    
    return {
      success: true,
      fuentes: ["IPTV-org (famelack source)", "Pluto TV"],
      totalCanales: canalesConLinks.length,
      totalIPTV: iptvCanales.length,
      totalPlutoTV: plutoCanales.length,
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

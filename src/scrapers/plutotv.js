const axios = require("axios");

const PLUTO_API_BASE = "https://api.pluto.tv/v2";

const PLUTO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Origin": "https://pluto.tv",
  "Referer": "https://pluto.tv/"
};

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

function buildStreamUrl(channelId) {
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

function formatChannel(ch) {
  return {
    id: ch._id,
    nombre: ch.name,
    slug: ch.slug,
    numero: ch.number || null,
    descripcion: ch.summary || null,
    categoria: ch.category || null,
    logo: ch.logo?.path || null,
    thumbnail: ch.thumbnail?.path || null,
    imagen: ch.featuredImage?.path || null,
    tile: ch.tile?.path || null,
    url_pluto: `https://pluto.tv/latam/live-tv/${ch._id}`,
    stream_hls: buildStreamUrl(ch._id),
    en_vivo: true
  };
}

async function scrapPlutoTVCanales() {
  console.log("📺 Obteniendo canales de Pluto TV...");

  try {
    const res = await axios.get(`${PLUTO_API_BASE}/channels`, {
      params: PLUTO_CLIENT_PARAMS,
      headers: PLUTO_HEADERS,
      timeout: 30000
    });

    const canales = res.data.map(formatChannel);

    const porCategoria = {};
    canales.forEach(c => {
      const cat = c.categoria || "Sin categoría";
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(c);
    });

    console.log(`✅ Pluto TV: ${canales.length} canales obtenidos`);

    return {
      success: true,
      fuente: "Pluto TV API",
      totalCanales: canales.length,
      categorias: Object.keys(porCategoria).sort(),
      canales,
      porCategoria,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error obteniendo canales de Pluto TV:", error.message);
    return {
      success: false,
      error: error.message,
      canales: []
    };
  }
}

async function scrapPlutoTVCanalPorId(channelId) {
  console.log(`📺 Obteniendo canal de Pluto TV: ${channelId}`);

  try {
    const res = await axios.get(`${PLUTO_API_BASE}/channels/${channelId}`, {
      headers: PLUTO_HEADERS,
      timeout: 15000
    });

    const ch = res.data;
    const canal = formatChannel(ch);

    console.log(`✅ Canal encontrado: ${canal.nombre}`);

    return {
      success: true,
      fuente: "Pluto TV API",
      canal,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error obteniendo canal ${channelId}:`, error.message);
    return {
      success: false,
      error: `Canal no encontrado: ${channelId}`,
      canal: null
    };
  }
}

async function scrapPlutoTVCanalPorCategoria(categoria) {
  console.log(`📺 Obteniendo canales de Pluto TV - categoría: ${categoria}`);

  try {
    const data = await scrapPlutoTVCanales();
    if (!data.success) return data;

    const canalesFiltrados = data.canales.filter(
      c => c.categoria && c.categoria.toLowerCase().includes(categoria.toLowerCase())
    );

    return {
      success: true,
      fuente: "Pluto TV API",
      categoria,
      totalCanales: canalesFiltrados.length,
      canales: canalesFiltrados,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error filtrando por categoría:", error.message);
    return {
      success: false,
      error: error.message,
      canales: []
    };
  }
}

module.exports = {
  scrapPlutoTVCanales,
  scrapPlutoTVCanalPorId,
  scrapPlutoTVCanalPorCategoria
};

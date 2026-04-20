const axios = require("axios");
const cheerio = require("cheerio");

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
    appVersion: "5.0.0",
    clientID: "pluto-latam-api",
    clientModelNumber: "1",
    deviceDNT: "false",
    deviceMake: "Chrome",
    deviceModel: "web",
    deviceType: "web",
    deviceVersion: "120.0",
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

function extractJsonStringifyObject(html, fromIndex) {
  const start = html.indexOf("{", fromIndex);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.substring(start, i + 1);
    }
  }
  return null;
}

async function scrapCanalesPremium() {
  const URL_PREMIUM = "https://90minutos16.blogspot.com/p/canales-premium.html?m=1";
  console.log("📺 Obteniendo canales premium de 90minutos...");

  try {
    const { data: html } = await axios.get(URL_PREMIUM, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const canales = [];
    const nombreRe = /"nombre"\s*:\s*"([^"]+)"/g;
    let m;

    while ((m = nombreRe.exec(html)) !== null) {
      const blockStart = m.index;
      const blockEnd   = html.indexOf("JSON.stringify", blockStart + m[0].length) + 200;
      const segment    = html.substring(blockStart, Math.min(blockEnd + 1000, html.length));

      const tipoM   = segment.match(/"tipo"\s*:\s*"([^"]+)"/);
      const urlM    = segment.match(/"url"\s*:\s*"([^"]+)"/);
      const imagenM = segment.match(/"imagen"\s*:\s*"([^"]+)"/);

      if (!urlM || !imagenM) continue;

      let params = null;
      const jsIdx = segment.indexOf("JSON.stringify");
      if (jsIdx !== -1) {
        const rawObj = extractJsonStringifyObject(segment, jsIdx + "JSON.stringify".length);
        if (rawObj) {
          try {
            const cleaned = rawObj
              .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ")
              .replace(/,(\s*[}\]])/g, "$1");
            params = JSON.parse(cleaned);
          } catch (_) {
            params = null;
          }
        }
      }

      canales.push({
        nombre: m[1].trim(),
        tipo:   tipoM ? tipoM[1].trim() : null,
        url:    urlM[1].trim(),
        imagen: imagenM[1].trim(),
        params,
        fuente: "90minutos-premium"
      });
    }

    console.log(`✅ Canales premium obtenidos: ${canales.length} canales de 90minutos`);

    return {
      success: true,
      fuente: "90minutos-premium",
      totalCanales: canales.length,
      canales,
      ultimaActualizacion: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error obteniendo canales premium:", error.message);
    return {
      success: false,
      error: error.message,
      canales: []
    };
  }
}

module.exports = {
  scrapCanales,
  scrapCanalesPorPais,
  scrapCanalesPorCategoria,
  scrapCanalesDeportes,
  scrapCanalesPremium
};

const axios = require("axios");

const IPTV_API = "https://iptv-org.github.io/api";

async function fetchJson(url) {
  const res = await axios.get(url, {
    timeout: 30000,
    headers: { "Accept": "application/json" }
  });
  return res.data;
}

async function scrapCanales2({ pais, categoria, buscar, limite } = {}) {
  console.log("📺 Obteniendo canales de IPTV-org (iptv-org.github.io)...");

  try {
    const [channels, streams, countries] = await Promise.all([
      fetchJson(`${IPTV_API}/channels.json`),
      fetchJson(`${IPTV_API}/streams.json`),
      fetchJson(`${IPTV_API}/countries.json`)
    ]);

    // Mapa de streams por canal
    const streamMap = {};
    for (const s of streams) {
      if (!streamMap[s.channel]) streamMap[s.channel] = [];
      streamMap[s.channel].push(s.url);
    }

    // Mapa de países
    const countryMap = {};
    for (const c of countries) {
      countryMap[c.code] = { nombre: c.name, bandera: c.flag || null };
    }

    // Solo canales que tienen al menos un stream
    let canales = channels
      .filter(c => streamMap[c.id] && streamMap[c.id].length > 0)
      .map(c => {
        const info = countryMap[c.country] || { nombre: c.country || "Desconocido", bandera: null };
        return {
          nombre: c.name,
          logo: c.logo || null,
          pais: info.nombre,
          codigoPais: c.country || null,
          bandera: info.bandera,
          categorias: c.categories || [],
          idiomas: c.languages || [],
          sitioWeb: c.website || null,
          streams: streamMap[c.id]
        };
      });

    // Filtros opcionales
    if (pais) {
      const p = pais.toLowerCase();
      canales = canales.filter(c =>
        c.codigoPais?.toLowerCase() === p ||
        c.pais?.toLowerCase().includes(p)
      );
    }

    if (categoria) {
      const cat = categoria.toLowerCase();
      canales = canales.filter(c =>
        c.categorias.some(x => x.toLowerCase().includes(cat))
      );
    }

    if (buscar) {
      const q = buscar.toLowerCase();
      canales = canales.filter(c => c.nombre.toLowerCase().includes(q));
    }

    if (limite && !isNaN(parseInt(limite))) {
      canales = canales.slice(0, parseInt(limite));
    }

    console.log(`✅ IPTV-org: ${canales.length} canales con streams disponibles`);

    return {
      success: true,
      fuente: "iptv-org (github.com/iptv-org/iptv)",
      sitio: "https://iptv-org.github.io",
      totalCanales: canales.length,
      totalConStreams: canales.length,
      filtros: { pais: pais || null, categoria: categoria || null, buscar: buscar || null },
      nota: "Cada canal incluye uno o más streams M3U8 directos. Puedes filtrar con ?pais=MX, ?categoria=sports, ?buscar=espn, ?limite=50",
      actualizado: new Date().toISOString(),
      canales: canales.map(c => ({
        nombre: c.nombre,
        logo: c.logo,
        pais: c.pais,
        codigoPais: c.codigoPais,
        bandera: c.bandera,
        categorias: c.categorias,
        idiomas: c.idiomas,
        sitioWeb: c.sitioWeb,
        totalStreams: c.streams.length,
        streamPrincipal: c.streams[0],
        streams: c.streams
      }))
    };
  } catch (error) {
    console.error("❌ Error en scrapCanales2:", error.message);
    return {
      success: false,
      fuente: "iptv-org",
      error: error.message,
      totalCanales: 0,
      canales: []
    };
  }
}

module.exports = { scrapCanales2 };

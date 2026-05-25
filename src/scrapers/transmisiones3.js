const axios = require("axios");

const DIARIES_URL = "https://pltvhd.com/diaries.json";
const IMG_BASE    = "https://cdn.ftvhd.com";
const BASE_SITE   = "https://tvtvhd.com";

function tryBase64Decode(str) {
  try {
    const decoded = Buffer.from(str, "base64").toString("utf8");
    if (decoded.startsWith("http") || decoded.startsWith("/")) {
      return decoded;
    }
  } catch {}
  return null;
}

function decodeEmbedUrl(iframePath) {
  try {
    let embedUrl = iframePath;

    const layer1 = tryBase64Decode(iframePath);
    if (layer1) {
      embedUrl = layer1;
    }

    const match = embedUrl.match(/[?&]r=([^&]+)/);
    if (match && match[1]) {
      const layer2 = tryBase64Decode(match[1]);
      if (layer2) return layer2;
      return decodeURIComponent(match[1]);
    }

    return embedUrl.startsWith("http") ? embedUrl : `${BASE_SITE}${embedUrl}`;
  } catch {}
  return iframePath.startsWith("http") ? iframePath : `${BASE_SITE}${iframePath}`;
}

function getEmbedUrl(iframePath) {
  try {
    const layer1 = tryBase64Decode(iframePath);
    if (layer1) {
      return layer1.startsWith("http") ? layer1 : `${BASE_SITE}${layer1}`;
    }
    return iframePath.startsWith("http") ? iframePath : `${BASE_SITE}${iframePath}`;
  } catch {}
  return iframePath.startsWith("http") ? iframePath : `${BASE_SITE}${iframePath}`;
}

async function scrapTransmisiones3() {
  try {
    console.log("📺 Obteniendo transmisiones desde tvtvhd.com/eventos...");

    const response = await axios.get(DIARIES_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://tvtvhd.com/",
        "Accept": "application/json, */*"
      },
      timeout: 15000
    });

    const items = response.data?.data || [];
    const transmisiones = [];

    for (const item of items) {
      const attr = item.attributes || {};
      const embeds = (attr.embeds && attr.embeds.data) || [];

      const titulo = (attr.diary_description || "Evento desconocido").replace(/\n/g, " ").trim();
      const hora   = attr.diary_hour   ? attr.diary_hour.substring(0, 5) : "00:00";
      const fecha  = attr.date_diary   || new Date().toISOString().split("T")[0];
      const liga   = attr.country?.data?.attributes?.name || "Deportes";

      const flagPath = attr.country?.data?.attributes?.image?.data?.attributes?.url;
      const logoUrl  = flagPath ? `${IMG_BASE}${flagPath}` : null;

      const enlaces = embeds
        .filter(e => e && e.attributes && e.attributes.embed_iframe)
        .map(e => {
          const iframePath = e.attributes.embed_iframe;
          const nombre     = e.attributes.embed_name || "Ver";
          const url        = decodeEmbedUrl(iframePath);
          const urlProxy   = getEmbedUrl(iframePath);
          return { nombre, url, urlProxy };
        });

      if (enlaces.length === 0) continue;

      transmisiones.push({
        titulo,
        hora,
        fecha,
        liga,
        logoUrl,
        enlacesDetalle: enlaces
      });
    }

    console.log(`📺 Transmisiones3 (tvtvhd.com): ${transmisiones.length} eventos encontrados`);

    return {
      total:        transmisiones.length,
      actualizado:  new Date().toISOString(),
      fuente:       "tvtvhd.com/eventos",
      nota:         "Eventos deportivos en vivo con múltiples canales por evento",
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones3:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones de tvtvhd.com: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones3 };

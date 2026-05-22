const axios = require("axios");

const DIARIES_URL = "https://pltvhd.com/diaries.json";
const IMG_BASE    = "https://cdn.ftvhd.com";
const BASE_SITE   = "https://tvtvhd.com";

function decodeEmbedUrl(iframePath) {
  try {
    const match = iframePath.match(/[?&]r=([^&]+)/);
    if (match && match[1]) {
      return Buffer.from(match[1], "base64").toString("utf8");
    }
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
          return { nombre, url };
        });

      if (enlaces.length === 0) continue;

      transmisiones.push({
        id:         item.id,
        titulo,
        evento:     titulo,
        deporte:    "DEPORTES",
        liga,
        hora,
        fecha,
        logo:       logoUrl,
        canal:      enlaces[0]?.nombre || "Canal",
        url:        enlaces[0]?.url    || null,
        urlBackup:  enlaces[1]?.url    || null,
        urlBackup2: enlaces[2]?.url    || null,
        enlaces:    enlaces.map(e => e.url),
        enlacesDetalle: enlaces,
        estado:     "En vivo",
        fuente:     "tvtvhd.com"
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

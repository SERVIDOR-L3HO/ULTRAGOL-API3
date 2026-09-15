const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE_URL = "https://www.tvenvivo2.com/";
const CACHE_TTL = 10 * 60 * 1000;
const DETAIL_CONCURRENCY = 8;

let cachedData = null;
let cachedAt = 0;

function absoluteUrl(value) {
  if (!value) return null;

  try {
    return new URL(value, SOURCE_URL).toString();
  } catch {
    return null;
  }
}

async function scrapeChannelDetails(channel) {
  try {
    const response = await axios.get(channel.pagina, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Referer": SOURCE_URL
      },
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const enlaces = [];
    const seen = new Set();

    $(".option[data-src]").each((index, element) => {
      const url = absoluteUrl($(element).attr("data-src"));
      if (!url || seen.has(url)) return;

      seen.add(url);
      enlaces.push({
        nombre: $(element).text().replace(/\s+/g, " ").trim() || `Opción ${index + 1}`,
        url
      });
    });

    if (enlaces.length === 0) return null;

    return {
      nombre: channel.nombre,
      logo: channel.logo,
      url: enlaces[0].url,
      enlaces,
      pagina: channel.pagina
    };
  } catch (error) {
    console.warn(`⚠️ No se pudieron obtener los enlaces de ${channel.nombre}: ${error.message}`);
    return null;
  }
}

async function scrapTransmisionesCA() {
  const now = Date.now();
  if (cachedData && now - cachedAt < CACHE_TTL) {
    return cachedData;
  }

  try {
    const response = await axios.get(SOURCE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const seen = new Set();
    const canales = [];

    $(".channel").each((index, element) => {
      const href = absoluteUrl($(element).attr("href"));
      if (!href || seen.has(href)) return;

      const image = $(element).find(".channel-logo img").first();
      const logo = absoluteUrl(
        image.attr("src") || image.attr("data-src") || image.attr("data-lazy-src")
      );
      const nombre =
        $(element).find(".channel-name").first().text().replace(/\s+/g, " ").trim() ||
        image.attr("alt") ||
        $(element).attr("aria-label") ||
        `Canal ${index + 1}`;

      seen.add(href);
      canales.push({
        nombre,
        logo,
        pagina: href
      });
    });

    const transmisiones = [];
    for (let index = 0; index < canales.length; index += DETAIL_CONCURRENCY) {
      const batch = canales.slice(index, index + DETAIL_CONCURRENCY);
      const results = await Promise.all(batch.map(scrapeChannelDetails));
      transmisiones.push(...results.filter(Boolean));
    }

    const result = {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "tvenvivo2.com",
      canalesEncontrados: canales.length,
      transmisiones
    };

    cachedData = result;
    cachedAt = now;
    return result;
  } catch (error) {
    console.error("❌ Error en scrapTransmisionesCA:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones de tvenvivo2.com: ${error.message}`);
  }
}

module.exports = { scrapTransmisionesCA };
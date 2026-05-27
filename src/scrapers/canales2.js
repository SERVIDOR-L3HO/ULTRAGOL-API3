const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.tvplusgratis2.com";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.google.com/",
  "Connection": "keep-alive",
  "Cache-Control": "no-cache"
};

async function fetchPage(url, timeout = 12000) {
  const res = await axios.get(url, {
    headers: HEADERS,
    timeout,
    maxRedirects: 5
  });
  return res.data;
}

async function getStreamFromPage(pageUrl) {
  try {
    const html = await fetchPage(pageUrl, 10000);
    const $ = cheerio.load(html);

    // Buscar m3u8 directas en el HTML
    const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
    if (m3u8Match) return { tipo: "m3u8", url: m3u8Match[0] };

    // Buscar iframes de reproductores (excluir anuncios)
    const iframes = [];
    $("iframe").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (
        src &&
        src !== "" &&
        !src.includes("ads") &&
        !src.includes("doubleclick") &&
        !src.includes("google") &&
        !src.includes("facebook")
      ) {
        iframes.push(src.startsWith("http") ? src : BASE_URL + src);
      }
    });

    if (iframes.length > 0) return { tipo: "iframe", url: iframes[0] };

    return { tipo: "pagina", url: pageUrl };
  } catch {
    return { tipo: "pagina", url: pageUrl };
  }
}

async function scrapCanales2(conStreams = false) {
  console.log("📺 Obteniendo canales de tvplusgratis2.com...");

  try {
    const html = await fetchPage(BASE_URL);
    const $ = cheerio.load(html);

    const canalesMap = new Map();

    // Selector principal: todos los enlaces a páginas -en-vivo
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href.includes("-en-vivo")) return;

      const fullUrl = href.startsWith("http") ? href : BASE_URL + "/" + href.replace(/^\//, "");
      if (canalesMap.has(fullUrl)) return;

      const img = $(el).find("img").first();
      let nombre = img.attr("alt") || $(el).attr("title") || $(el).text().trim();
      nombre = nombre
        .replace(/en\s*vivo/gi, "")
        .replace(/ver\s*/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (!nombre) return;

      let logo = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || null;
      if (logo && !logo.startsWith("http")) logo = BASE_URL + "/" + logo.replace(/^\//, "");

      canalesMap.set(fullUrl, { nombre, logo: logo || null, pagina: fullUrl });
    });

    // Fallback: buscar imágenes dentro de enlaces -en-vivo
    if (canalesMap.size === 0) {
      $("img").each((_, el) => {
        const parent = $(el).closest("a");
        const href = parent.attr("href") || "";
        if (!href.includes("-en-vivo")) return;

        const fullUrl = href.startsWith("http") ? href : BASE_URL + "/" + href.replace(/^\//, "");
        if (canalesMap.has(fullUrl)) return;

        const nombre = ($(el).attr("alt") || "").replace(/en\s*vivo/gi, "").trim();
        if (!nombre) return;

        let logo = $(el).attr("src") || $(el).attr("data-src") || null;
        if (logo && !logo.startsWith("http")) logo = BASE_URL + "/" + logo.replace(/^\//, "");

        canalesMap.set(fullUrl, { nombre, logo: logo || null, pagina: fullUrl });
      });
    }

    let canales = Array.from(canalesMap.values());
    console.log(`🔎 Encontrados ${canales.length} canales`);

    // Obtener streams solo si se solicita explícitamente
    if (conStreams && canales.length > 0) {
      console.log("🔗 Obteniendo streams de cada canal (puede tardar)...");
      const BATCH = 10;
      for (let i = 0; i < canales.length; i += BATCH) {
        const lote = canales.slice(i, i + BATCH);
        const resultados = await Promise.all(lote.map(c => getStreamFromPage(c.pagina)));
        resultados.forEach((r, idx) => {
          canales[i + idx].streamTipo = r.tipo;
          canales[i + idx].streamUrl = r.url;
        });
      }
    } else {
      canales = canales.map(c => ({
        ...c,
        streamTipo: "pagina",
        streamUrl: c.pagina
      }));
    }

    console.log(`✅ tvplusgratis2.com: ${canales.length} canales obtenidos`);

    return {
      success: true,
      fuente: "tvplusgratis2.com",
      sitio: BASE_URL,
      totalCanales: canales.length,
      streamsResueltos: conStreams,
      nota: conStreams
        ? "streamUrl contiene el iframe/m3u8 extraído de cada canal"
        : "Usa ?streams=true para resolver el iframe/m3u8 de cada canal (más lento)",
      actualizado: new Date().toISOString(),
      canales: canales.map(c => ({
        nombre: c.nombre,
        logo: c.logo,
        pagina: c.pagina,
        streamTipo: c.streamTipo,
        streamUrl: c.streamUrl
      }))
    };
  } catch (error) {
    console.error("❌ Error en scrapCanales2:", error.message);
    return {
      success: false,
      fuente: "tvplusgratis2.com",
      error: error.message,
      totalCanales: 0,
      canales: []
    };
  }
}

module.exports = { scrapCanales2, getStreamFromPage };

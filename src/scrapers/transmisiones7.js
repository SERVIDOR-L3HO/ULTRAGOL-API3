const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE_URL = "https://futbollibretv.su/agenda/";

function decodeLink(href) {
  if (!href) return null;
  try {
    const url = new URL(href);
    const r = url.searchParams.get("r");
    if (r) {
      return Buffer.from(r, "base64").toString("utf-8");
    }
    return href;
  } catch {
    return href;
  }
}

async function scrapTransmisiones7() {
  const startTime = Date.now();

  try {
    console.log("🔄 Obteniendo transmisiones desde futbollibretv.su/agenda/...");

    const response = await axios.get(SOURCE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-MX,es;q=0.9",
        "Referer": "https://futbollibretv.su/"
      },
      timeout: 20000
    });

    const $ = cheerio.load(response.data);
    const transmisiones = [];
    const deportes = {};

    $("ul.menu > li").each((_, el) => {
      const $li = $(el);
      const pais = ($li.attr("class") || "").trim().toUpperCase();

      const titleRaw = $li.children("a").first().clone().children("span").remove().end().text().trim();
      const horaRaw = $li.find("a > span.t").first().text().trim();

      if (!titleRaw) return;

      const colonIdx = titleRaw.indexOf(":");
      let liga = "General";
      let evento = titleRaw;
      if (colonIdx !== -1) {
        liga = titleRaw.substring(0, colonIdx).trim();
        evento = titleRaw.substring(colonIdx + 1).trim();
      }

      let equipo1 = evento;
      let equipo2 = "";
      const vsMatch = evento.match(/^(.+?)\s+vs\s+(.+)$/i);
      if (vsMatch) {
        equipo1 = vsMatch[1].trim();
        equipo2 = vsMatch[2].trim();
      }

      const canales = [];
      $li.find("li.subitem1 a").each((_, link) => {
        const $a = $(link);
        const href = $a.attr("href") || "";
        const canalNombre = $a.clone().children("span").remove().end().text().trim();
        const calidad = $a.find("span").text().trim();
        const urlDecodificada = decodeLink(href);

        if (urlDecodificada) {
          canales.push({
            canal: canalNombre,
            calidad: calidad || "720p",
            url: urlDecodificada,
            urlProxy: href
          });
        }
      });

      if (!deportes[liga]) deportes[liga] = 0;
      deportes[liga]++;

      transmisiones.push({
        liga,
        evento,
        equipo1,
        equipo2,
        pais,
        hora: horaRaw || "Por confirmar",
        totalCanales: canales.length,
        canales
      });
    });

    const elapsedTime = Date.now() - startTime;
    const conLinks = transmisiones.filter(t => t.canales.length > 0).length;

    console.log(`✅ Transmisiones7 (futbollibretv.su): ${transmisiones.length} partidos, ${conLinks} con links en ${elapsedTime}ms`);

    return {
      total: transmisiones.length,
      conLinks,
      actualizado: new Date().toISOString(),
      fuente: "futbollibretv.su",
      deportes,
      deportesDisponibles: Object.keys(deportes),
      elapsedTime: `${elapsedTime}ms`,
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones7:", error.message);
    return {
      total: 0,
      conLinks: 0,
      actualizado: new Date().toISOString(),
      fuente: "futbollibretv.su",
      error: `Error obteniendo transmisiones: ${error.message}`,
      deportes: {},
      deportesDisponibles: [],
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones7 };

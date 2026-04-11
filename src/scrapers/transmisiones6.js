const axios = require("axios");

const FUTBOL_LIBRE_URL = "https://futbollibretv.su/";

function limpiarTexto(texto) {
  return (texto || "").replace(/\s+/g, " ").trim();
}

function extraerPartidos(html) {
  const partidos = [];
  const regex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const row = match[1];
    const celdas = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(item =>
      limpiarTexto(item[1].replace(/<[^>]*>/g, " "))
    );

    if (celdas.length < 2) continue;

    const textoFila = limpiarTexto(celdas.join(" "));
    if (!textoFila) continue;
    if (/^(fecha|hora|partido|evento|canal|liga)$/i.test(celdas[0])) continue;

    partidos.push({
      evento: textoFila,
      fecha: celdas[0] || null,
      hora: celdas[1] || null,
      enlace: null,
      fuente: "futbollibretv.su"
    });
  }

  return partidos;
}

async function scrapTransmisiones6() {
  const startTime = Date.now();

  try {
    console.log("🔄 Obteniendo transmisiones desde futbollibretv.su...");

    const response = await axios.get(FUTBOL_LIBRE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": FUTBOL_LIBRE_URL
      },
      timeout: 15000
    });

    const transmisiones = extraerPartidos(response.data);
    const elapsedTime = Date.now() - startTime;

    console.log(`📺 Transmisiones7 (futbollibretv.su) procesadas: ${transmisiones.length} en ${elapsedTime}ms`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "futbollibretv.su",
      referencia: FUTBOL_LIBRE_URL,
      elapsedTime: `${elapsedTime}ms`,
      transmisiones
    };
  } catch (error) {
    console.error("❌ Error en scrapTransmisiones6:", error.message);

    return {
      total: 0,
      actualizado: new Date().toISOString(),
      fuente: "futbollibretv.su",
      referencia: FUTBOL_LIBRE_URL,
      error: `Error obteniendo transmisiones: ${error.message}`,
      transmisiones: []
    };
  }
}

module.exports = { scrapTransmisiones6 };

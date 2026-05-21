const axios = require("axios");

const BASE_URL = "https://bolaloca.my/player";
const TOTAL_IDS = 200;
const SOURCES = [1, 2, 3];

async function scrapTransmisiones3() {
  try {
    console.log("📺 Generando transmisiones desde bolaloca.my...");

    const transmisiones = [];

    for (let id = 1; id <= TOTAL_IDS; id++) {
      const enlaces = SOURCES.map(src => `${BASE_URL}/${src}/${id}`);

      transmisiones.push({
        id: id,
        canal: `Canal ${id}`,
        titulo: `Stream ${id}`,
        evento: `Stream ${id}`,
        deporte: "DEPORTES",
        liga: "N/A",
        info: "bolaloca.my",
        url: enlaces[0],
        urlBackup: enlaces[1] || null,
        urlBackup2: enlaces[2] || null,
        enlaces: enlaces,
        estado: "En vivo",
        fuente: "bolaloca.my"
      });
    }

    console.log(`📺 Transmisiones3 (bolaloca.my): ${transmisiones.length} canales generados`);

    return {
      total: transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente: "bolaloca.my",
      nota: "Cada canal tiene hasta 3 fuentes de respaldo (enlaces[0], enlaces[1], enlaces[2])",
      transmisiones: transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones3:", error.message);
    throw new Error(`No se pudieron generar las transmisiones de bolaloca.my: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones3 };

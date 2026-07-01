const axios = require("axios");

const DIARIES_URL = "https://pltvhd.com/diaries.json";
const IMG_BASE    = "https://cdn.ftvhd.com";
const BASE_SITE   = "https://tvtvhd.com";

const m3u8Cache = new Map();
const CACHE_TTL  = 15 * 60 * 1000;

function tryBase64Decode(str) {
  try {
    const decoded = Buffer.from(str, "base64").toString("utf8");
    if (decoded.startsWith("http") || decoded.startsWith("/")) return decoded;
  } catch {}
  return null;
}

function extractStreamName(iframePath) {
  try {
    let url = iframePath;
    const layer1 = tryBase64Decode(iframePath);
    if (layer1) url = layer1;

    const rMatch = url.match(/[?&]r=([^&]+)/);
    if (rMatch) {
      const layer2 = tryBase64Decode(rMatch[1]);
      if (layer2) url = layer2;
      else url = decodeURIComponent(rMatch[1]);
    }

    if (!url.startsWith("http")) url = BASE_SITE + url;

    const streamMatch = url.match(/[?&]stream=([^&]+)/);
    return streamMatch ? streamMatch[1] : null;
  } catch {
    return null;
  }
}

async function resolveM3u8(streamName) {
  if (!streamName) return null;

  const cached = m3u8Cache.get(streamName);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.url;

  try {
    const res = await axios.get(
      `https://tvhd2.com/tv/canales.php?stream=${streamName}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://tvhd2.com/"
        },
        timeout: 10000
      }
    );

    const match = res.data.match(/var\s+playbackURL\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
    if (!match) return null;

    const url = match[1];
    m3u8Cache.set(streamName, { url, ts: Date.now() });
    return url;
  } catch {
    return null;
  }
}

async function resolveWithConcurrency(tasks, limit = 5) {
  const results = new Array(tasks.length).fill(null);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function scrapTransmisiones3() {
  try {
    console.log("📺 Obteniendo transmisiones desde tvtvhd.com...");

    const response = await axios.get(DIARIES_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://tvtvhd.com/",
        "Accept": "application/json, */*"
      },
      timeout: 15000
    });

    const items = response.data?.data || [];

    // Aplanar todos los embeds de todos los eventos en tareas paralelas
    const allTasks = [];
    for (const item of items) {
      const attr    = item.attributes || {};
      const embeds  = (attr.embeds?.data) || [];
      const titulo  = (attr.diary_description || "Evento desconocido").replace(/\n/g, " ").trim();
      const hora    = attr.diary_hour ? attr.diary_hour.substring(0, 5) : "00:00";
      const fecha   = attr.date_diary || new Date().toISOString().split("T")[0];
      const liga    = attr.country?.data?.attributes?.name || "Deportes";
      const flagPath = attr.country?.data?.attributes?.image?.data?.attributes?.url;
      const logoUrl  = flagPath ? `${IMG_BASE}${flagPath}` : null;

      for (const e of embeds) {
        const ea = e?.attributes || {};
        const canalNombre = (ea.embed_name || "").trim();
        const iframePath  = ea.embed_iframe || "";
        if (!iframePath) continue;

        allTasks.push(async () => {
          const streamName = extractStreamName(iframePath);
          if (!streamName) return null;
          const m3u8 = await resolveM3u8(streamName);
          if (!m3u8) return null;
          return { titulo, hora, fecha, liga, logoUrl, canal: canalNombre || streamName, m3u8 };
        });
      }
    }

    const results = await resolveWithConcurrency(allTasks, 8);
    const transmisiones = results.filter(Boolean);

    console.log(`✅ gol-3 (tvtvhd): ${transmisiones.length}/${allTasks.length} canales resueltos de ${items.length} eventos`);

    return {
      total:       transmisiones.length,
      actualizado: new Date().toISOString(),
      fuente:      "tvtvhd.com",
      transmisiones
    };

  } catch (error) {
    console.error("❌ Error en scrapTransmisiones3:", error.message);
    throw new Error(`No se pudieron obtener las transmisiones de tvtvhd.com: ${error.message}`);
  }
}

module.exports = { scrapTransmisiones3 };

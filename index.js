const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ API de Liga MX activa. Visita /tabla para ver los datos.");
});

app.get("/tabla", async (req, res) => {
  try {
    const url = "https://www.mediotiempo.com/futbol/liga-mx/tabla";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const equipos = [];

    $("table tbody tr").each((i, el) => {
      const posicion = $(el).find("td:nth-child(1)").text().trim();
      const equipo = $(el).find("td:nth-child(2)").text().trim();
      const puntos = $(el).find("td:last-child").text().trim();

      if (posicion && equipo && puntos) {
        equipos.push({ posicion, equipo, puntos });
      }
    });

    res.json({
      actualizado: new Date().toLocaleString("es-MX"),
      total: equipos.length,
      tabla: equipos,
    });
  } catch (error) {
    console.error("Error en scraping:", error.message);
    res.status(500).json({ error: "No se pudo obtener la tabla" });
  }
});

// Puerto dinámico (Replit usa 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
      

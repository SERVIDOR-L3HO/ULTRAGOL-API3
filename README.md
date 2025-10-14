# 🏆 Liga MX API Profesional

API profesional con scraping en tiempo real de la Liga MX. Datos actualizados automáticamente cada 30 minutos con técnicas anti-detección.

## 🚀 Características

- ✅ **Scraping automatizado** cada 30 minutos
- ✅ **Caché inteligente** para optimizar rendimiento
- ✅ **Técnicas anti-detección** (rotación de User-Agents, headers realistas, delays aleatorios)
- ✅ **Datos reales** de fuentes confiables (ESPN, Mediotiempo)
- ✅ **4 endpoints principales** + endpoint combinado

## 📡 Endpoints

### `GET /`
Información general de la API
```json
{
  "nombre": "Liga MX API Profesional",
  "version": "2.0.0",
  "endpoints": { ... }
}
```

### `GET /tabla`
Tabla de posiciones completa con estadísticas
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 18,
  "tabla": [
    {
      "posicion": 1,
      "equipo": "Toluca",
      "estadisticas": {
        "pj": 12,
        "pg": 9,
        "pe": 1,
        "pp": 2,
        "gf": 35,
        "gc": 16,
        "dif": 19,
        "pts": 28
      }
    }
  ]
}
```

### `GET /noticias`
Últimas noticias de la Liga MX
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 15,
  "noticias": [
    {
      "titulo": "...",
      "descripcion": "...",
      "url": "...",
      "imagen": "...",
      "fecha": "14/10/2025"
    }
  ]
}
```

### `GET /goleadores`
Top goleadores del torneo
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 20,
  "goleadores": [
    {
      "posicion": 1,
      "jugador": "Paulinho",
      "equipo": "Toluca",
      "goles": 9
    }
  ]
}
```

### `GET /equipos`
Listado completo de equipos
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 18,
  "equipos": [
    {
      "id": 1,
      "nombre": "América",
      "nombreCorto": "AMÉ",
      "url": "https://...",
      "liga": "Liga MX"
    }
  ]
}
```

### `GET /todo`
Todos los datos en un solo endpoint
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "tabla": [...],
  "noticias": [...],
  "goleadores": [...],
  "equipos": [...]
}
```

## 🔧 Tecnologías

- **Node.js** - Runtime
- **Express** - Framework web
- **Axios** - Cliente HTTP con anti-detección
- **Cheerio** - Scraping HTML
- **node-cron** - Tareas programadas

## 🏃 Ejecutar localmente

```bash
npm install
npm start
```

El servidor estará disponible en `http://localhost:5000`

## 🔄 Actualización automática

Los datos se actualizan automáticamente cada 30 minutos usando tareas programadas (cron).

## 🛡️ Anti-detección

- Rotación de User-Agents realistas (Chrome, Firefox, Safari, Edge)
- Headers HTTP completos y consistentes
- Delays aleatorios entre requests (1-3 segundos)
- Retry con backoff exponencial
- Respeto a límites de tasa (429 handling)

## 📊 Fuentes de datos

- **ESPN Deportes** - Tabla de posiciones, goleadores, equipos
- **Mediotiempo** - Noticias de Liga MX

## 🌟 Estructura del proyecto

```
├── index.js                  # Servidor principal
├── src/
│   ├── cache/
│   │   └── dataCache.js      # Sistema de caché
│   ├── scrapers/
│   │   ├── tabla.js          # Scraper de tabla
│   │   ├── noticias.js       # Scraper de noticias
│   │   ├── goleadores.js     # Scraper de goleadores
│   │   └── equipos.js        # Scraper de equipos
│   └── utils/
│       └── scraper.js        # Utilidades anti-detección
├── package.json
└── README.md
```

## 📝 Licencia

MIT

---

Desarrollado con ⚽ para los fans de la Liga MX

# Multi-League Football API

## 📋 Descripción General
API profesional de scraping en tiempo real para múltiples ligas de fútbol. Proporciona datos actualizados de tabla de posiciones, goleadores y noticias para Liga MX, Premier League, La Liga, Serie A, Bundesliga y Ligue 1. Incluye además equipos, logos y videos de YouTube para Liga MX, con actualización automática cada 30 minutos.

## 🎯 Estado Actual
- ✅ API multi-liga completamente funcional
- ✅ 6 ligas soportadas: Liga MX, Premier League, La Liga, Serie A, Bundesliga, Ligue 1
- ✅ 28 endpoints operativos (8 para Liga MX + 20 para ligas internacionales)
- ✅ Sistema de caché dinámico implementado (30 min)
- ✅ Actualización automática con node-cron
- ✅ Técnicas anti-detección integradas
- ✅ Datos reales de fuentes confiables (ESPN, BBC Sport, FlashScore)
- ✅ Scrapers especializados por liga y tipo de dato
- ✅ Endpoint de próximos partidos con contador de tiempo en todas las ligas

## 🏗️ Arquitectura del Proyecto

### Estructura de Archivos
```
├── index.js                    # Servidor Express principal
├── src/
│   ├── cache/dataCache.js      # Sistema de caché dinámico en memoria
│   ├── scrapers/               # Módulos de scraping
│   │   ├── tabla.js            # Liga MX - Tabla de posiciones (ESPN)
│   │   ├── noticias.js         # Liga MX - Noticias (Mediotiempo)
│   │   ├── goleadores.js       # Liga MX - Goleadores (ESPN)
│   │   ├── equipos.js          # Liga MX - Equipos (ESPN)
│   │   ├── logos.js            # Liga MX - Logos (ESPN CDN)
│   │   ├── videos.js           # Liga MX - Videos (YouTube)
│   │   ├── partidos.js         # Liga MX - Próximos partidos con contador (ESPN)
│   │   ├── premier/            # Premier League
│   │   │   ├── tabla.js        # Tabla (ESPN Hidden API)
│   │   │   ├── noticias.js     # Noticias (ESPN)
│   │   │   ├── goleadores.js   # Goleadores (ESPN Hidden API)
│   │   │   └── partidos.js     # Próximos partidos con contador (ESPN)
│   │   ├── laliga/             # La Liga
│   │   │   ├── tabla.js        # Tabla (ESPN Hidden API)
│   │   │   ├── noticias.js     # Noticias (FlashScore)
│   │   │   ├── goleadores.js   # Goleadores (ESPN Hidden API)
│   │   │   └── partidos.js     # Próximos partidos con contador (ESPN)
│   │   ├── seriea/             # Serie A
│   │   │   ├── tabla.js        # Tabla (ESPN Hidden API)
│   │   │   ├── noticias.js     # Noticias (ESPN)
│   │   │   ├── goleadores.js   # Goleadores (ESPN Hidden API)
│   │   │   └── partidos.js     # Próximos partidos con contador (ESPN)
│   │   ├── bundesliga/         # Bundesliga
│   │   │   ├── tabla.js        # Tabla (ESPN Hidden API)
│   │   │   ├── noticias.js     # Noticias (ESPN)
│   │   │   ├── goleadores.js   # Goleadores (ESPN Hidden API)
│   │   │   └── partidos.js     # Próximos partidos con contador (ESPN)
│   │   └── ligue1/             # Ligue 1
│   │       ├── tabla.js        # Tabla (ESPN Hidden API)
│   │       ├── noticias.js     # Noticias (ESPN)
│   │       ├── goleadores.js   # Goleadores (ESPN Hidden API)
│   │       └── partidos.js     # Próximos partidos con contador (ESPN)
│   └── utils/scraper.js        # Utilidades anti-detección
├── package.json
└── README.md
```

### Tecnologías Utilizadas
- **Node.js 20** - Runtime
- **Express 4.21** - Framework web
- **Axios 1.12** - Cliente HTTP
- **Cheerio 1.1** - Parser HTML
- **node-cron 4.2** - Tareas programadas
- **googleapis** - Cliente de Google APIs (YouTube)

## 🔄 Cambios Recientes

### 2025-10-16: Endpoint de Próximos Partidos v3.1
- ✅ **Nuevos endpoints de próximos partidos para todas las ligas**:
  - `/partidos` - Liga MX
  - `/premier/partidos` - Premier League
  - `/laliga/partidos` - La Liga
  - `/seriea/partidos` - Serie A
  - `/bundesliga/partidos` - Bundesliga
  - `/ligue1/partidos` - Ligue 1
- ✅ **Contador de tiempo en vivo**:
  - Muestra días, horas, minutos y segundos hasta cada partido
  - Actualización dinámica del tiempo restante
  - Funciona correctamente para partidos del día actual
- ✅ **Información completa de cada partido**:
  - Equipos local y visitante
  - Fecha del partido
  - Hora del partido
  - Fecha completa formateada
  - Contador de tiempo con mensaje descriptivo
- ✅ **Sistema de caché integrado** (30 min) para todos los endpoints
- ⚠️ **Limitación conocida**: ESPN no proporciona fechas futuras en formato parseable en HTML, algunos partidos futuros aparecen con fecha "Por confirmar" o "TBC"

### 2025-10-16: Expansión Multi-Liga v3.0
- ✅ **5 nuevas ligas internacionales agregadas**:
  - Premier League (Inglaterra)
  - La Liga (España)
  - Serie A (Italia)
  - Bundesliga (Alemania)
  - Ligue 1 (Francia)
- ✅ **15 nuevos endpoints** (3 por liga):
  - `/[liga]/tabla` - Tabla de posiciones
  - `/[liga]/noticias` - Noticias
  - `/[liga]/goleadores` - Top goleadores
- ✅ **Sistema de caché mejorado**:
  - Soporte para claves dinámicas
  - Manejo seguro de nuevas ligas sin inicialización previa
  - Fix crítico en dataCache.js para evitar errores con claves undefined
- ✅ **Nuevas fuentes de datos**:
  - ESPN Hidden API para tablas y goleadores internacionales
  - BBC Sport para noticias de Premier League
  - FlashScore para noticias de La Liga
- ✅ **Arquitectura modular escalable**:
  - Estructura por carpetas por liga
  - Scrapers especializados por tipo de dato
  - Código reutilizable y mantenible

### 2025-10-16: Nuevo Endpoint de Videos v2.2
- ✅ Nuevo endpoint /videos:
  - Videos de YouTube de la Liga MX
  - Búsqueda de mejores momentos, resúmenes, repeticiones y highlights
  - Scraping web para evitar límites de cuota de API
  - Organización por categorías
  - Metadatos completos: título, descripción, canal, thumbnail, duración, vistas, fecha
  - URLs directas y URLs para embeber
  - Hasta 50 videos recientes
  - Integración con sistema de caché (30 min)
- ✅ Endpoint /todo actualizado con videos

### 2025-10-15: Mejoras y Nuevo Endpoint v2.1
- ✅ Endpoint de noticias mejorado:
  - Imagen completa de cada noticia
  - Fuente identificada (Mediotiempo)
  - Texto completo del artículo
  - Fecha y hora con formato mexicano
- ✅ Nuevo endpoint /logos:
  - Logos de todos los equipos de Liga MX
  - 4 tamaños disponibles (pequeño, mediano, grande, normal)
  - URLs de alta calidad desde ESPN CDN
  - Ordenados alfabéticamente
- ✅ Endpoint /todo actualizado con logos

### 2025-10-14: Implementación API Profesional v2.0
- ✅ Reestructuración completa del proyecto
- ✅ Sistema modular con separación de responsabilidades
- ✅ Implementación de caché con actualización cada 30 minutos
- ✅ Scrapers especializados para cada fuente de datos
- ✅ Técnicas anti-detección:
  - Rotación de User-Agents (Chrome, Firefox, Safari, Edge)
  - Headers HTTP completos y realistas
  - Delays aleatorios (1-3 seg)
  - Retry con backoff exponencial
  - Manejo de rate limits (429)
- ✅ Nuevos endpoints: /noticias, /goleadores, /equipos, /todo
- ✅ Migración a fuentes más estables (ESPN + Mediotiempo)

### 2025-10-14: Setup Inicial
- ✅ Configuración del entorno Replit
- ✅ Servidor configurado en puerto 5000 con 0.0.0.0
- ✅ Workflow configurado para desarrollo
- ✅ Deployment configurado (autoscale)

## 🚀 Endpoints Disponibles

### Liga MX (8 endpoints)
| Endpoint | Descripción | Fuente | Datos |
|----------|-------------|--------|-------|
| `/` | Info de la API | N/A | Documentación completa |
| `/tabla` | Tabla de posiciones | ESPN | 18 equipos con estadísticas |
| `/noticias` | Noticias con imagen y texto | Mediotiempo | 15 noticias con imagen, fuente y texto |
| `/goleadores` | Top goleadores | ESPN | 20 goleadores |
| `/equipos` | Lista de equipos | ESPN | 18 equipos |
| `/logos` | Logos de equipos | ESPN CDN | 18 equipos con logos en 4 tamaños |
| `/videos` | Videos de YouTube | YouTube | Mejores momentos, resúmenes y repeticiones |
| `/partidos` | Próximos partidos | ESPN | Partidos con contador de tiempo |
| `/todo` | Todos los datos | Múltiple | Consolidado (incluye logos y videos) |

### Ligas Internacionales (20 endpoints)
| Endpoint | Descripción | Fuente | Datos |
|----------|-------------|--------|-------|
| `/premier/tabla` | Premier League tabla | ESPN API | 20 equipos con estadísticas |
| `/premier/noticias` | Premier League noticias | ESPN | Noticias recientes |
| `/premier/goleadores` | Premier League goleadores | ESPN API | Top 20 goleadores |
| `/premier/partidos` | Premier League partidos | ESPN | Partidos con contador de tiempo |
| `/laliga/tabla` | La Liga tabla | ESPN API | 20 equipos con estadísticas |
| `/laliga/noticias` | La Liga noticias | FlashScore | Noticias recientes |
| `/laliga/goleadores` | La Liga goleadores | ESPN API | Top 20 goleadores |
| `/laliga/partidos` | La Liga partidos | ESPN | Partidos con contador de tiempo |
| `/seriea/tabla` | Serie A tabla | ESPN API | 20 equipos con estadísticas |
| `/seriea/noticias` | Serie A noticias | ESPN | Noticias recientes |
| `/seriea/goleadores` | Serie A goleadores | ESPN API | Top 20 goleadores |
| `/seriea/partidos` | Serie A partidos | ESPN | Partidos con contador de tiempo |
| `/bundesliga/tabla` | Bundesliga tabla | ESPN API | 18 equipos con estadísticas |
| `/bundesliga/noticias` | Bundesliga noticias | ESPN | Noticias recientes |
| `/bundesliga/goleadores` | Bundesliga goleadores | ESPN API | Top 20 goleadores |
| `/bundesliga/partidos` | Bundesliga partidos | ESPN | Partidos con contador de tiempo |
| `/ligue1/tabla` | Ligue 1 tabla | ESPN API | 18 equipos con estadísticas |
| `/ligue1/noticias` | Ligue 1 noticias | ESPN | Noticias recientes |
| `/ligue1/goleadores` | Ligue 1 goleadores | ESPN API | Top 20 goleadores |
| `/ligue1/partidos` | Ligue 1 partidos | ESPN | Partidos con contador de tiempo |

## 🎛️ Configuración

### Variables de Entorno
- `PORT` - Puerto del servidor (default: 5000)
- `NODE_ENV` - Entorno de ejecución

### Sistema de Caché
- Duración: 30 minutos
- Actualización automática: Cada 30 min (cron: `*/30 * * * *`) - solo Liga MX
- Almacenamiento: Memoria (no persistente)
- Soporte dinámico: Crea entradas automáticamente para nuevas ligas
- Manejo seguro: Valida existencia de claves antes de acceder

### Anti-Detección
El sistema implementa múltiples técnicas para evitar bloqueos:
1. **User-Agent Rotation**: 6 user-agents diferentes (navegadores reales)
2. **Headers realistas**: Accept, Accept-Language, Referer, etc.
3. **Delays aleatorios**: 1-3 segundos entre requests
4. **Retry logic**: Hasta 3 intentos con backoff exponencial
5. **Rate limit handling**: Detecta y espera en caso de 429

## 🔧 Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# El servidor inicia en http://localhost:5000
```

## 📊 Fuentes de Datos

### Liga MX
- **ESPN Deportes** (Tabla, Goleadores, Equipos)
  - URL: `https://www.espn.com.mx/futbol/`
  - Estructura: HTML con tablas
- **Mediotiempo** (Noticias)
  - URL: `https://www.mediotiempo.com/futbol/liga-mx`
  - Estructura: HTML con artículos
- **YouTube** (Videos)
  - URL: `https://www.youtube.com/results`
  - Estructura: Web scraping de ytInitialData JSON

### Ligas Internacionales
- **ESPN Hidden API** (Tablas y Goleadores)
  - Endpoints: `/apis/site/v2/sports/soccer/[league]/standings`
  - Ligas: Premier League (ENG.1), La Liga (ESP.1), Serie A (ITA.1), Bundesliga (GER.1), Ligue 1 (FRA.1)
  - Formato: JSON estructurado
- **ESPN** (Noticias - Serie A, Bundesliga, Ligue 1)
  - URL: `https://www.espn.com/soccer/[league]`
  - Estructura: HTML con artículos
- **BBC Sport** (Noticias - Premier League)
  - URL: `https://www.bbc.com/sport/football/premier-league`
  - Estructura: HTML con artículos
- **FlashScore** (Noticias - La Liga)
  - URL: FlashScore La Liga
  - Estructura: HTML con artículos

Actualización: En cada request del usuario (con caché de 30 min)

## 🎯 Próximas Mejoras Potenciales
- [ ] Extender actualización automática (cron) para todas las ligas
- [ ] Agregar health checks para detectar cambios en selectores
- [ ] Agregar endpoint de calendario/partidos para todas las ligas
- [ ] Implementar WebSockets para datos en tiempo real
- [ ] Agregar caché persistente (Redis)
- [ ] Implementar rotación de proxies
- [ ] Estadísticas históricas por temporada
- [ ] API de jugadores individuales
- [ ] Agregar más ligas (MLS, Eredivisie, Liga Portugal, etc.)

## 🐛 Debugging

### Logs
Los logs del servidor muestran:
- 🔄 Inicio de actualización de datos
- ✅ Actualización exitosa
- ❌ Errores por fuente (tabla, noticias, etc.)

### Problemas Comunes
1. **Tabla vacía**: Verificar estructura HTML de ESPN (puede cambiar)
2. **429 Rate Limit**: El sistema espera automáticamente con backoff
3. **Timeout**: Aumentar timeout en scraper.js (default: 15s)

## 📝 Notas del Desarrollador
- El proyecto usa scraping ético con respeto a rate limits
- Los datos son de fuentes públicas
- La API no almacena datos personales
- Implementado siguiendo mejores prácticas de Node.js

---

**Última actualización**: 2025-10-16
**Versión**: 3.1.0

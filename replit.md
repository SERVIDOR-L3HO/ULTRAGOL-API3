# Liga MX API Profesional

## 📋 Descripción General
API profesional de scraping en tiempo real para la Liga MX. Proporciona datos actualizados de tabla de posiciones, goleadores, noticias, equipos, logos y videos de YouTube con actualización automática cada 30 minutos.

## 🎯 Estado Actual
- ✅ API completamente funcional
- ✅ 7 endpoints operativos (/tabla, /noticias, /goleadores, /equipos, /logos, /videos, /todo)
- ✅ Sistema de caché implementado (30 min)
- ✅ Actualización automática con node-cron
- ✅ Técnicas anti-detección integradas
- ✅ Datos reales de fuentes confiables
- ✅ Endpoint de noticias mejorado con imágenes, fuente y texto completo
- ✅ Endpoint de videos de YouTube con mejores momentos, resúmenes y repeticiones

## 🏗️ Arquitectura del Proyecto

### Estructura de Archivos
```
├── index.js                    # Servidor Express principal
├── src/
│   ├── cache/dataCache.js      # Sistema de caché en memoria
│   ├── scrapers/               # Módulos de scraping
│   │   ├── tabla.js            # Scraping tabla de posiciones (ESPN)
│   │   ├── noticias.js         # Scraping noticias (Mediotiempo)
│   │   ├── goleadores.js       # Scraping goleadores (ESPN)
│   │   ├── equipos.js          # Scraping equipos (ESPN)
│   │   ├── logos.js            # Scraping logos (ESPN CDN)
│   │   └── videos.js           # Scraping videos (YouTube)
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

| Endpoint | Descripción | Fuente | Datos |
|----------|-------------|--------|-------|
| `/` | Info de la API | N/A | Documentación |
| `/tabla` | Tabla de posiciones | ESPN | 18 equipos con estadísticas |
| `/noticias` | Noticias con imagen y texto | Mediotiempo | 15 noticias con imagen, fuente y texto |
| `/goleadores` | Top goleadores | ESPN | 20 goleadores |
| `/equipos` | Lista de equipos | ESPN | 18 equipos |
| `/logos` | Logos de equipos | ESPN CDN | 18 equipos con logos en 4 tamaños |
| `/videos` | Videos de YouTube | YouTube | Mejores momentos, resúmenes y repeticiones (hasta 50 videos) |
| `/todo` | Todos los datos | Múltiple | Consolidado (incluye logos y videos) |

## 🎛️ Configuración

### Variables de Entorno
- `PORT` - Puerto del servidor (default: 5000)
- `NODE_ENV` - Entorno de ejecución

### Sistema de Caché
- Duración: 30 minutos
- Actualización automática: Cada 30 min (cron: `*/30 * * * *`)
- Almacenamiento: Memoria (no persistente)

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

### ESPN Deportes (Tabla, Goleadores, Equipos)
- URL: `https://www.espn.com.mx/futbol/`
- Estructura: HTML con tablas
- Actualización: En cada request del usuario (con caché)

### Mediotiempo (Noticias)
- URL: `https://www.mediotiempo.com/futbol/liga-mx`
- Estructura: HTML con artículos
- Actualización: En cada request del usuario (con caché)

### YouTube (Videos)
- URL: `https://www.youtube.com/results`
- Estructura: Web scraping de ytInitialData JSON
- Categorías: Mejores momentos, resúmenes, repeticiones, highlights
- Actualización: En cada request del usuario (con caché)

## 🎯 Próximas Mejoras Potenciales
- [ ] Agregar endpoint de calendario/partidos
- [ ] Implementar WebSockets para datos en tiempo real
- [ ] Agregar caché persistente (Redis)
- [ ] Implementar rotación de proxies
- [ ] Agregar más fuentes de noticias
- [ ] Estadísticas históricas por temporada
- [ ] API de jugadores individuales

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
**Versión**: 2.2.0

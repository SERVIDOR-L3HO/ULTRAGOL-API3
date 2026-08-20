# Football Data Hub API

## Overview
A Node.js/Express REST API that scrapes real-time football data from ESPN, Mediotiempo, and other sources. Covers 6 major leagues (Liga MX, Premier League, La Liga, Serie A, Bundesliga, Ligue 1) plus movies, TV series, live TV channels, drama shorts, and sport transmissions.

- **Version:** 3.5.0
- **Port:** 5000
- **Auto-update interval:** Every 20 minutes

## Running the project
```bash
npm start
```
The workflow `Start application` is configured and runs `npm start` automatically.

## Stack
- **Runtime:** Node.js 20
- **Framework:** Express
- **Scraping:** Axios + Cheerio (HTML), Puppeteer-core (JS-rendered pages)
- **Cron:** node-cron for scheduled data refresh
- **Cache:** In-memory via `src/cache/dataCache.js`

## AnimeJara API
The project also exposes anime search and episode servers from AnimeJara without
using TMDB IDs:

```text
GET /api/anime/buscar?q=naruto
GET /api/anime/:slug
GET /api/anime/:slug/temporada/:temporada/episodio/:episodio
DELETE /api/anime/cache
```

The episode endpoint returns the embed URLs published by AnimeJara, including
the internal `idanime` and `idcapitulo` query parameters. AnimeJara may return
HTTP 404 for an episode while still serving valid player HTML; the scraper
validates the extracted content rather than relying only on the status code.

## Project structure
```
index.js                  # Main server (~6600 lines) — all routes defined here
src/
  cache/dataCache.js      # In-memory cache layer
  scrapers/
    tabla.js              # Liga MX standings
    noticias.js           # Liga MX news
    goleadores.js         # Liga MX top scorers
    equipos.js            # Liga MX teams
    logos.js              # Team logos
    videos.js             # Video clips
    calendario.js         # Liga MX calendar/fixtures
    marcadores.js         # Live scores (all leagues)
    peliculas.js          # Movie scraper
    series.js             # TV series scraper
    transmisiones*.js     # Live stream sources (1-6)
    canales*.js           # TV channel listings
    dramaShorts.js        # Drama/short video content
    premier/              # Premier League scrapers
    laliga/               # La Liga scrapers
    seriea/               # Serie A scrapers
    bundesliga/           # Bundesliga scrapers
    ligue1/               # Ligue 1 scrapers
  utils/scraper.js        # Anti-detection utilities (UA rotation, delays)
```

## Environment variables
- `PORT` — server port (default: 5000)
- `SESSION_SECRET` — secret for express-session
- `PUPPETEER_SKIP_DOWNLOAD` / `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` — set to `true` on Replit (no bundled Chromium)
- `PUPPETEER_EXECUTABLE_PATH` — path to system Chromium if puppeteer features are needed

## User preferences
- Keep existing project structure and stack.

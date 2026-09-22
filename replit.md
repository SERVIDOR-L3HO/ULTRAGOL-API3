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

The episode endpoint visits the embeds published by AnimeJara and returns the
server links found inside them (`nyuu`, `filemoon`, `streamhg`, `voe`, etc.),
without exposing the outer `multiplayer.streamhj.top` URLs. AnimeJara may return
HTTP 404 for an episode while still serving valid player HTML; the scraper
validates the extracted content rather than relying only on the status code.

## Nova TV API
The `/nova` endpoint scrapes the channel catalog from
`https://futbollibretvs.co/channels` and resolves each channel through the
source's playback API. The response is a list containing only `logo`, `nombre`
and `url`. Use `/nova?canal=espn` to resolve one channel. Add `force=true` to
bypass the short-lived cache when a stream token has expired:

```text
GET /nova
GET /nova?canal=espn
GET /nova?canal=espn&force=true
GET /nova?url=https%3A%2F%2Ffutbollibretvs.co%2Fchannel%2Ffox-sports
GET /nova?catalogo=true
```

Each item in the JSON array contains an HLS proxy URL or an iframe URL, depending
on what the source currently provides. HLS links use `/api/nova-stream` because
the source requires a playback session cookie; the proxy also rewrites the
variant and segment URLs. The same three-field shape is returned for the
complete catalog and for `url`, `pagina`, or `canal`.

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

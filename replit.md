# L3HO Interactive — Football Data Hub API

Multi-league football REST API with real-time scraping from ESPN, Mediotiempo, and other sources.

## Stack
- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Scraping:** Axios + Cheerio (primary), Puppeteer-core (optional, for JS-heavy pages)
- **Caching:** In-memory cache (`src/cache/dataCache.js`)
- **Auth:** API key system stored in `data/apikeys.json` (local file store)
- **Optional:** Firebase Admin (API key management via Firestore)

## Running the app

```bash
npm start
```

The server starts on port 5000. The workflow `Start application` handles this automatically.

## Leagues covered
- Liga MX
- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1

## Key endpoints
- `GET /` — API docs UI
- `GET /tabla` — Liga MX standings
- `GET /noticias` — Liga MX news
- `GET /goleadores` — Top scorers
- `GET /equipos` — Teams
- `GET /marcadores` — Live scores (all leagues)
- `GET /peliculas/:id` — Movie scraping
- `GET /series/:id` — Series scraping
- `GET /canales` — Live TV channels

Most endpoints require an `X-Api-Key` header (generate keys via the admin panel).

## Environment variables / secrets
- `SESSION_SECRET` — (set) Express session secret
- `FIREBASE_SERVICE_ACCOUNT_JSON` — (optional) Firebase Admin credentials JSON; without it, API key auth falls back to local file store
- `FIREBASE_PROJECT_ID` — (optional) Firebase project ID (default: `apik-9510b`)
- `FIREBASE_WEB_API_KEY` — (optional) Firebase Web API key for Firestore REST access
- `PUPPETEER_EXECUTABLE_PATH` — (optional) Path to Chromium binary for Puppeteer scraping

## Project structure
```
index.js                  # Main server (6000+ lines, all routes)
src/
  cache/dataCache.js      # In-memory cache layer
  firebase/admin.js       # Firebase Admin SDK init (optional)
  middleware/
    apiKeyAuth.js         # API key authentication middleware
    auth.js               # Rate limiting + security headers
  scrapers/               # One file per league/feature
  storage/
    keyStore.js           # Local file-based API key store
    firestoreKeyStore.js  # Firestore-based API key store
data/apikeys.json         # Local API key storage (auto-created)
```

## User preferences

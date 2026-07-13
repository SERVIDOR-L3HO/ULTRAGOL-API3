---
name: Unlimplay embed scraping
description: Where unlimplay.com actually puts its streaming server links, for the servpeli scraper in this project.
---

On unlimplay.com embed pages (`/f/embed/movie/:id`, `/f/embed/tv/:id/:season/:episode`), the `const EMBEDS = ...` variable declared near the top of the HTML is unreliable — it is frequently left as an empty placeholder (e.g. `[]`) even when the movie/episode has servers available.

The real, authoritative server list is injected later in the page via an inline `<script>` that calls `finalizePlayer({...})` with the full `{ lang: { serverName: url } }` object. When there are multiple `finalizePlayer(...)` calls in the page, the last one with non-empty data is the one to trust.

**Why:** Debugging "no links returned" reports showed `const EMBEDS` was empty/decoy while `finalizePlayer(...)` consistently (6/6 in testing) carried the real data — this looks like a deliberate anti-scraping decoy on their end.

**How to apply:** Any future scraping of unlimplay.com embed pages should parse `finalizePlayer(\s*\{...\})` first and only fall back to `const EMBEDS = {...}` if no `finalizePlayer` call is found. Also note: unlimplay added a `remux` server type (`https://remux.unlimplay.com/remux?id=<id>`) that serves raw MP4 bytes directly (not m3u8, not an HTML embed) — treat it differently from generic iframe embeds.

---
name: ZonaAPS embed scraping
description: How ZonaAPS exposes movie embeds for the movie streaming endpoint.
---

ZonaAPS uses a WordPress Dooplay site. A TMDB movie ID is not its post ID: resolve the title through the site's search page, read the internal `data-postid`, then query `/wp-json/dooplayer/v2/{postId}/movie/{option}` for each player option.

**Why:** The public page embeds are loaded through Dooplay's player API and the internal post IDs are unrelated to TMDB IDs.

**How to apply:** Keep ZonaAPS as the primary source for the movie endpoint, preserve the option order, and retain the existing Unlimplay path as a fallback when search or player API requests fail.
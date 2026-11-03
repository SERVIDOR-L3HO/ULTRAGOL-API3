---
name: HLS proxy referers
description: Preserve source-page request context when proxying nested HLS playlists and segments.
---

When an HLS origin checks request context, rewritten variant playlists, encryption-key URIs, and segments must carry the original player-page referrer. A successful master manifest alone does not confirm playback.

**Why:** The StreamXHD master manifest and variant returned successfully, but playback needed the source-page referer and matching origin carried through every rewritten manifest URL.

**How to apply:** When changing the shared HLS proxy, propagate referrer metadata through each rewritten URI and verify a master, variant, and segment request end to end without logging signed URLs.

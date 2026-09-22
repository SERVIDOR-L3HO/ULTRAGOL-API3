---
name: Nova stream proxy
description: Reliability constraints for futbollibretvs.co HLS playback through the single /nova endpoint.
---

Nova HLS links must be stable by channel rather than depending only on in-memory relay keys. The source playback cookie and signed relay URLs can expire, and in-memory keys disappear when the workflow restarts.

**Why:** A key-only URL continued to return a manifest briefly but failed after a restart or when the source advanced its media playlist. Stable channel URLs let the server acquire a fresh playback session and rebuild the current variant and segment paths.

**How to apply:** Keep public HLS URLs on `/nova?stream=true&canal=<slug>`. Rewrite master and variant playlists through that route, preserve exact signed segment URLs while valid, and include a channel/variant/sequence fallback for expired segment keys.
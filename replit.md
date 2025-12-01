# Multi-League Football API

## Overview
This project provides a professional, real-time scraping API for multiple football leagues. Its primary purpose is to deliver up-to-date data including league standings, top scorers, news, teams, logos, and YouTube videos (for Liga MX). The API aims to be a reliable and comprehensive source of football statistics and information, serving as a backend for sports applications, data analysis, and news platforms. It supports Liga MX, Premier League, La Liga, Serie A, Bundesliga, and Ligue 1, with an ambitious vision to expand to more leagues and real-time features.

**NEW (Nov 2025):** The API is now fully compatible with Termux on Android devices, allowing users to run the entire football data API directly on their smartphones with automatic IP detection and easy deployment.

**NEW (Dec 2025):** Implemented professional session-based authentication system with L3HO Interactive branding. Secure login page with bcrypt password hashing, rate limiting, CSRF protection, and automatic session management. Protected dashboard requires authentication while API endpoints remain functional.

## User Preferences
I prefer clear and concise information. When making changes, prioritize modularity and scalability. I value detailed explanations for complex architectural decisions. Do not make changes to the `replit.nix` file.

## System Architecture
The project is built on Node.js 20 with Express 4.21, designed for high performance and scalability.

**Technical Implementations:**
*   **Multi-Source Scraping System (NEW - Oct 2025):** Revolutionary failover architecture that queries 3 independent data sources per league (ESPN, Soccerway, FlashScore) with intelligent fallback. If the primary source fails or is slow, the system automatically switches to the next available source, ensuring maximum uptime and the freshest data possible. All responses include source metadata (fuente, fuente_url, tiempo_scraping_ms) for transparency.
*   **Lineup System with Multi-Source Photos (NEW - Nov 2025):** Professional lineup endpoint system for all 6 leagues with intelligent data aggregation. Uses ESPN API as primary source for match lineups including player names, positions, jersey numbers, and tactical formations. Automatically enriches player photos using TheSportsDB when ESPN doesn't provide images, with fallback to generated avatars. Smart caching with 15-minute TTL ensures fresh data while minimizing API calls. Detects when lineups are unavailable (typically published 1 hour before matches) and provides clear user feedback. Includes endpoints for individual leagues and a unified endpoint for all leagues.
*   **Dynamic Caching System:** An in-memory cache stores data with flexible TTL (time-to-live) support, significantly reducing external requests and improving response times. Default 30-minute cache for most data, 15-minute cache for lineups to ensure they update as soon as they're published.
*   **Automated Updates:** `node-cron` schedules automatic data refreshes every 20 minutes for general Liga MX endpoints and every 15 minutes for lineup cache invalidation, ensuring data freshness.
*   **Anti-detection Mechanisms:** To prevent blocking, the API employs User-Agent rotation (Chrome, Firefox, Safari, Edge), realistic HTTP headers, random delays (1-3 seconds), exponential backoff for retries (up to 3 attempts), and rate limit handling (429 status codes).
*   **Modular Scraper Architecture:** Scrapers are organized by league and data type with source adapters in `src/scrapers/sources/<league>/` directories. Each league has dedicated adapters for ESPN, Soccerway, and FlashScore, all coordinated through `src/utils/multiSourceScraper.js`.
*   **Data Sources:** Data is aggregated from multiple reliable sources (ESPN, Soccerway, FlashScore, BBC Sport, Mediotiempo, TheSportsDB), with automatic failover between sources to guarantee data availability even if individual sources experience downtime or rate limiting.
*   **Endpoint Design:** The API offers 43+ operational endpoints across 6 leagues, including detailed calendar endpoints with matchday information and live countdowns for all supported leagues. Includes unified endpoints for all leagues (`/calendario/todas-las-ligas`, `/marcadores/todas-las-ligas`, `/alineaciones/todas-las-ligas`).
*   **Video Integration (Liga MX):** A dedicated endpoint scrapes YouTube for Liga MX highlight videos, providing comprehensive metadata without relying on the YouTube API quota.
*   **Mejores Momentos (NEW - Oct 2025):** YouTube highlights scraping for all leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) with categorized content (mejores momentos, highlights, resúmenes, repeticiones), returning up to 50 recent videos per league with complete metadata (title, description, channel, thumbnail, duration, views, publish date, URLs).
*   **Logo Integration (Liga MX):** Provides high-quality team logos in multiple sizes from ESPN's CDN.
*   **Transmisiones System with Team Logos (NEW - Nov 2025):** Comprehensive sports streaming system with 5 independent sources (rereyano.ru, dp.mycraft.click, e1link.link, ftvhd.com, donromans.com) providing international sports events coverage. All transmissions endpoints now include automatic team logo extraction using intelligent name parsing, supporting multiple sports (football, basketball, hockey, tennis, etc.) and international competitions. The system features base64 decoding for streaming links, proxy URL generation, country flags, and multi-channel support with cache management. The newest source (donromans.com) uses a WordPress API to provide organized events by league with multiple link types (urls_list, SpecialLinks, channels, servers) including replay support and platform compatibility indicators.
*   **Secure Authentication System (NEW - Dec 2025):** Session-based authentication using Express.js with bcrypt password hashing, rate limiting, CSRF protection, and HTTP-only secure cookies. Admin panel protected with automatic timeout (30 minutes) and security headers. Credentials managed via environment variables (ADMIN_PASSWORD, L3HO_PASSWORD) for production security.

**UI/UX Decisions:**
*   Professional dark-themed dashboard with L3HO Interactive branding and gradient design
*   Login page features cyan-to-purple gradient, security badges, and password visibility toggle
*   Responsive design works on desktop and mobile devices
*   Floating particle animations and grid overlay for visual polish
*   User information display in header with logout button

**Security Features:**
*   **Password Security:** bcryptjs hashing with salt rounds of 12
*   **Session Management:** Express-session with 24-hour maximum age and HTTP-only cookies
*   **Rate Limiting:** Login endpoint limited to 5 attempts per 15-minute window
*   **CSRF Protection:** Token-based protection on all POST requests
*   **Security Headers:** Helmet.js with Content Security Policy
*   **Access Logging:** All requests logged with IP address and user agent
*   **Session Timeout:** Automatic logout after 30 minutes of inactivity
*   **Password Delay:** 1-second delay on failed login attempts to prevent brute force

**Feature Specifications:**
*   **League Data:** Comprehensive standings, top scorers, and news for all supported leagues.
*   **Full Article Content Extraction (NEW - Nov 2025):** News endpoints now extract and return the complete text content of news articles instead of just links. The system visits each article URL and extracts the full body text, with intelligent parsing for different sources (Mediotiempo, ESPN, BBC Sport). Each news item includes a `contenido` field with the full article text and a `contenidoDisponible` flag. To optimize performance, the first 5 articles include full content while remaining articles provide placeholders with links for on-demand access.
*   **Liga MX Specifics:** Includes team lists, logos (4 sizes), and YouTube video highlights (up to 50 recent videos with metadata).
*   **Calendar with Matchdays:** Provides detailed fixture lists, including matchday numbers, team names, dates, times, and a live countdown to each match for all leagues.
*   **Unified Calendar Endpoint:** `/calendario/todas-las-ligas` provides a professional aggregated view of all fixtures across all 6 leagues with complete information (jornada, teams, dates, times, countdowns) and structured metadata (updated timestamp, total leagues, total matches per league).
*   **Mejores Momentos Endpoints:** All 5 European leagues now feature `/mejores-momentos` endpoints that scrape YouTube for league-specific highlights, best moments, and match summaries. Content is automatically categorized and cached for optimal performance.
*   **Match Lineups (NEW - Nov 2025):** Complete lineup information for all leagues with detailed player data including names, positions, jersey numbers, photos, and tactical formations. Features automatic photo enrichment from multiple sources, smart detection of lineup availability (with helpful messages when lineups aren't published yet), and endpoints for individual leagues (`/alineaciones`, `/premier/alineaciones`, etc.), all leagues combined (`/alineaciones/todas-las-ligas`), and specific matches by event ID (`/alineaciones/partido/:eventId`). Includes separation of starters and substitutes, captain indicators, and live match statistics when available.
*   **Sports Transmissions (NEW - Nov 2025):** Five comprehensive streaming endpoints (`/transmisiones`, `/transmisiones2`, `/transmisiones3`, `/transmisiones4`, `/transmisiones5`) aggregating live sports broadcasts from multiple international sources. Features include automatic team logo extraction and display, country flags, base64 link decoding, proxy URL generation for golazotvhd.com integration, multi-channel support, and coverage of global sports events from countries including Peru, Brazil, Chile, Colombia, Mexico, Bolivia, and international leagues (NBA, NHL, UEFA). The newest endpoint (`/transmisiones5`) uses the donromans.com WordPress API to provide structured events organized by league, time, and country, with support for replay viewing, platform compatibility (web/app), and multiple link sources (urls_list, SpecialLinks, channels, servers). Each transmission includes team names, logos, event times, streaming options, and real-time status indicators.

## Authentication Routes
*   `GET /login` - Login page (redirects authenticated users to home)
*   `POST /auth/login` - Submit login credentials (rate limited to 5 attempts per 15 minutes)
*   `GET /logout` - Logout and destroy session
*   `GET /auth/status` - Check current authentication status
*   `GET /` - Protected dashboard (requires authentication)

## External Dependencies
*   **Node.js 20:** JavaScript runtime environment.
*   **Express 4.21:** Web application framework for Node.js.
*   **Axios 1.12:** Promise-based HTTP client for making requests to external sources.
*   **Cheerio 1.1:** Fast, flexible, and lean implementation of core jQuery specifically designed for the server, used for HTML parsing.
*   **node-cron 4.2:** Library for scheduling tasks in Node.js.
*   **googleapis:** Google APIs client for Node.js, specifically used for interacting with YouTube (though web scraping is used for video data to avoid quota limits).
*   **bcryptjs 2.4:** Password hashing library for secure credential storage.
*   **express-session 1.17:** Session middleware for Express.js.
*   **express-rate-limit:** Rate limiting middleware to prevent brute force attacks.
*   **helmet:** Security middleware providing HTTP headers protection.
*   **crypto-js:** Cryptographic utility library.
*   **ESPN, Mediotiempo, BBC Sport, FlashScore, TheSportsDB:** Primary data sources for football statistics, news, and player imagery.

## Deployment Options

### Termux Support (Android)
The API now includes full Termux compatibility for running on Android devices:

*   **Automated Installation:** `install-termux.sh` script handles complete setup including Node.js, dependencies, and permissions
*   **Auto IP Detection:** `start-server.sh` automatically detects and displays the device's public IP address for easy integration with web applications
*   **Auto-start Capability:** Optional configuration for automatic server startup when Termux opens
*   **Public IP Display:** Server startup shows the complete API URL with public IP for direct use in web projects
*   **Full Documentation:** `TERMUX_INSTALACION.md` provides comprehensive installation guide with troubleshooting and remote access options (ngrok, localtunnel)

### Production Deployment
For production deployment, set the following environment variables:
*   `ADMIN_PASSWORD` - Secure password for admin user
*   `L3HO_PASSWORD` - Secure password for l3ho user
*   `NODE_ENV` - Set to 'production' for secure cookies
*   `SESSION_SECRET` - Random string for session encryption
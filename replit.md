# Multi-League Football API

## Overview
This project delivers a real-time scraping API for comprehensive football data across multiple leagues including Liga MX, Premier League, La Liga, Serie A, Bundesliga, and Ligue 1. It provides up-to-date information on league standings, top scorers, news, team details, logos, and video highlights. The API serves as a robust backend for sports applications, data analysis, and news platforms, with future ambitions for broader league coverage and advanced real-time features. It also integrates a unified streaming links aggregator and expanded Latin American league coverage via ESPN API, and features a professional session-based authentication system. The API is compatible with Termux for deployment on Android devices.

## User Preferences
I prefer clear and concise information. When making changes, prioritize modularity and scalability. I value detailed explanations for complex architectural decisions. Do not make changes to the `replit.nix` file.

## System Architecture
The project is built on Node.js 20 with Express 4.21, emphasizing high performance and scalability.

**UI/UX Decisions:**
*   Professional dark-themed dashboard with L3HO Interactive branding and gradient design.
*   Login page features cyan-to-purple gradient, security badges, and password visibility toggle.
*   Responsive design for desktop and mobile.
*   Floating particle animations and grid overlay for visual polish.
*   User information display in header with logout button.

**Technical Implementations:**
*   **Multi-Source Scraping System:** Revolutionary failover architecture queries 3 independent data sources per league (ESPN, Soccerway, FlashScore) with intelligent fallback for maximum uptime and data freshness.
*   **Lineup System with Multi-Source Photos:** Professional lineup endpoint system for all 6 leagues, aggregating data from ESPN API and enriching player photos using TheSportsDB, with smart caching.
*   **Dynamic Caching System:** In-memory cache with flexible TTL reduces external requests and improves response times (e.g., 30-minute for general data, 15-minute for lineups).
*   **Automated Updates:** `node-cron` schedules data refreshes every 20 minutes for general data and 15 minutes for lineup cache invalidation.
*   **Anti-detection Mechanisms:** Employs User-Agent rotation, realistic HTTP headers, random delays, exponential backoff, and rate limit handling to prevent blocking.
*   **Modular Scraper Architecture:** Scrapers are organized by league and data type, with source adapters coordinated through a multi-source scraper utility.
*   **Endpoint Design:** Offers 50+ operational endpoints across 6 leagues, including detailed calendar endpoints with live countdowns, unified endpoints for all leagues, and comprehensive real-time statistics endpoints.
*   **Statistics System:** Real-time match statistics from ESPN API including team-level stats (possession, shots, passes, cards, fouls, corners) and player-level stats, with support for live matches, finished matches, and historical data via date parameter.
*   **Video Integration:** Dedicated endpoints scrape YouTube for Liga MX highlight videos and "Mejores Momentos" for all 5 European leagues, categorizing and caching content.
*   **Transmisiones System with Team Logos:** Comprehensive sports streaming system aggregating live broadcasts from five independent sources, featuring automatic team logo extraction, country flags, base64 link decoding, proxy URL generation, and multi-channel support. The latest iteration uses a WordPress API for structured event data with replay and platform compatibility.
*   **Secure Authentication System:** Session-based authentication using Express.js with bcrypt password hashing, rate limiting, CSRF protection, and HTTP-only secure cookies. Includes an admin panel with automatic timeout and security headers.
*   **Full Article Content Extraction:** News endpoints extract and return complete article text from various sources, with intelligent parsing.
*   **Latin American Coverage:** Integration with ESPN API provides comprehensive data for 13 Latin American leagues and tournaments, including matches, standings, and team info, featuring intelligent caching and parallel requests.
*   **Embeddable L3HO Links:** The L3HO Links page is designed to be embeddable as an iframe/widget on external websites with proper CORS and X-Frame-Options configuration.

**Feature Specifications:**
*   **League Data:** Comprehensive standings, top scorers, and news.
*   **Liga MX Specifics:** Includes team lists, logos (4 sizes), and YouTube video highlights.
*   **Calendar with Matchdays:** Detailed fixture lists with matchday numbers, teams, dates, times, and live countdowns.
*   **Unified Calendar Endpoint:** Aggregated view of all fixtures across all 6 leagues.
*   **Match Lineups:** Complete lineup information with player data, photos, tactical formations, and availability detection.
*   **Real-Time Match Statistics:** Comprehensive live statistics for all matches including possession, shots (total, on target, blocked), passes (total, completed, accuracy), cards (yellow/red with player and minute), goals (scorer, assist, type), corners, fouls, offsides, substitutions, and individual player stats.
*   **Sports Transmissions:** Aggregated live sports broadcasts from multiple international sources.
*   **L3HO Links Aggregator:** Collects, de-duplicates, and displays streaming links from 5 sources alphabetically with search and quick access buttons.

**Security Features:**
*   **Password Security:** bcryptjs hashing with 12 salt rounds.
*   **Session Management:** Express-session with 24-hour max age and HTTP-only cookies.
*   **Rate Limiting:** Login endpoint limited to 5 attempts per 15 minutes.
*   **CSRF Protection:** Token-based protection on all POST requests.
*   **Security Headers:** Helmet.js with Content Security Policy.
*   **Access Logging:** All requests logged with IP and user agent.
*   **Session Timeout:** Automatic logout after 30 minutes of inactivity.
*   **Password Delay:** 1-second delay on failed login attempts.

## External Dependencies
*   **Node.js 20:** JavaScript runtime environment.
*   **Express 4.21:** Web application framework.
*   **Axios 1.12:** HTTP client.
*   **Cheerio 1.1:** HTML parsing (server-side jQuery).
*   **node-cron 4.2:** Task scheduler.
*   **googleapis:** Google APIs client (used for YouTube, though scraping is preferred).
*   **bcryptjs 2.4:** Password hashing.
*   **express-session 1.17:** Session middleware.
*   **express-rate-limit:** Rate limiting middleware.
*   **helmet:** Security middleware.
*   **crypto-js:** Cryptographic utility library.
*   **ESPN, Mediotiempo, BBC Sport, FlashScore, TheSportsDB, Soccerway, rereyano.ru, dp.mycraft.click, e1link.link, ftvhd.com, donromans.com:** Primary data and streaming sources.
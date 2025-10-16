# Multi-League Football API

## Overview
This project provides a professional, real-time scraping API for multiple football leagues. Its primary purpose is to deliver up-to-date data including league standings, top scorers, news, teams, logos, and YouTube videos (for Liga MX). The API aims to be a reliable and comprehensive source of football statistics and information, serving as a backend for sports applications, data analysis, and news platforms. It supports Liga MX, Premier League, La Liga, Serie A, Bundesliga, and Ligue 1, with an ambitious vision to expand to more leagues and real-time features.

## User Preferences
I prefer clear and concise information. When making changes, prioritize modularity and scalability. I value detailed explanations for complex architectural decisions. Do not make changes to the `replit.nix` file.

## System Architecture
The project is built on Node.js 20 with Express 4.21, designed for high performance and scalability.

**Technical Implementations:**
*   **Dynamic Caching System:** An in-memory cache stores data for 30 minutes, significantly reducing external requests and improving response times. It supports dynamic keys for various leagues and data types.
*   **Automated Updates:** `node-cron` schedules automatic data refreshes every 30 minutes for Liga MX endpoints, ensuring data freshness.
*   **Anti-detection Mechanisms:** To prevent blocking, the API employs User-Agent rotation (Chrome, Firefox, Safari, Edge), realistic HTTP headers, random delays (1-3 seconds), exponential backoff for retries (up to 3 attempts), and rate limit handling (429 status codes).
*   **Modular Scraper Architecture:** Scrapers are organized by league and data type (e.g., `src/scrapers/premier/tabla.js`), promoting reusability and maintainability.
*   **Data Sources:** Data is aggregated from reliable sources like ESPN, BBC Sport, Mediotiempo, and FlashScore, including ESPN's hidden APIs for international league tables and top scorers.
*   **Endpoint Design:** The API offers 28 operational endpoints across 6 leagues, including detailed calendar endpoints with matchday information and live countdowns for all supported leagues.
*   **Video Integration (Liga MX):** A dedicated endpoint scrapes YouTube for Liga MX highlight videos, providing comprehensive metadata without relying on the YouTube API quota.
*   **Logo Integration (Liga MX):** Provides high-quality team logos in multiple sizes from ESPN's CDN.

**UI/UX Decisions:**
*   While this is a backend API, future considerations for client-side applications would prioritize a clean, responsive design with intuitive data presentation.

**Feature Specifications:**
*   **League Data:** Comprehensive standings, top scorers, and news for all supported leagues.
*   **Liga MX Specifics:** Includes team lists, logos (4 sizes), and YouTube video highlights (up to 50 recent videos with metadata).
*   **Calendar with Matchdays:** Provides detailed fixture lists, including matchday numbers, team names, dates, times, and a live countdown to each match for all leagues.

## External Dependencies
*   **Node.js 20:** JavaScript runtime environment.
*   **Express 4.21:** Web application framework for Node.js.
*   **Axios 1.12:** Promise-based HTTP client for making requests to external sources.
*   **Cheerio 1.1:** Fast, flexible, and lean implementation of core jQuery specifically designed for the server, used for HTML parsing.
*   **node-cron 4.2:** Library for scheduling tasks in Node.js.
*   **googleapis:** Google APIs client for Node.js, specifically used for interacting with YouTube (though web scraping is used for video data to avoid quota limits).
*   **ESPN, Mediotiempo, BBC Sport, FlashScore:** Primary data sources for football statistics and news.
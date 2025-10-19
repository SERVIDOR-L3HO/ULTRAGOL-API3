const { tryMultipleSources } = require("../utils/multiSourceScraper");
const espnSource = require("./sources/ligamx/espn");
const soccerwaySource = require("./sources/ligamx/soccerway");
const flashscoreSource = require("./sources/ligamx/flashscore");

const sources = [
  soccerwaySource,
  espnSource,
  flashscoreSource
];

async function scrapTabla() {
  try {
    const result = await tryMultipleSources(sources, {
      selectBestBy: 'first',
      minFreshnessMinutes: 60
    });
    
    return result;
  } catch (error) {
    console.error("Error scraping tabla Liga MX:", error.message);
    throw error;
  }
}

module.exports = { scrapTabla };

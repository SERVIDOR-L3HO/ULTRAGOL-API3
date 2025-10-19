const { tryMultipleSources } = require("../../utils/multiSourceScraper");
const espnSource = require("../sources/seriea/espn");
const soccerwaySource = require("../sources/seriea/soccerway");
const flashscoreSource = require("../sources/seriea/flashscore");

const sources = [
  espnSource,
  soccerwaySource,
  flashscoreSource
];

async function scrapTablaSerieA() {
  try {
    const result = await tryMultipleSources(sources, {
      selectBestBy: 'first',
      minFreshnessMinutes: 60
    });
    
    return result;
  } catch (error) {
    console.error("Error scraping tabla Serie A:", error.message);
    throw error;
  }
}

module.exports = { scrapTablaSerieA };

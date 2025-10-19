const { tryMultipleSources } = require("../../utils/multiSourceScraper");
const espnSource = require("../sources/ligue1/espn");
const soccerwaySource = require("../sources/ligue1/soccerway");
const flashscoreSource = require("../sources/ligue1/flashscore");

const sources = [
  espnSource,
  soccerwaySource,
  flashscoreSource
];

async function scrapTablaLigue1() {
  try {
    const result = await tryMultipleSources(sources, {
      selectBestBy: 'first',
      minFreshnessMinutes: 60
    });
    
    return result;
  } catch (error) {
    console.error("Error scraping tabla Ligue 1:", error.message);
    throw error;
  }
}

module.exports = { scrapTablaLigue1 };

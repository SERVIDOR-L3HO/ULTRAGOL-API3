const { tryMultipleSources } = require("../../utils/multiSourceScraper");
const espnSource = require("../sources/laliga/espn");
const soccerwaySource = require("../sources/laliga/soccerway");
const flashscoreSource = require("../sources/laliga/flashscore");

const sources = [
  espnSource,
  soccerwaySource,
  flashscoreSource
];

async function scrapTablaLaLiga() {
  try {
    const result = await tryMultipleSources(sources, {
      selectBestBy: 'first',
      minFreshnessMinutes: 60
    });
    
    return result;
  } catch (error) {
    console.error("Error scraping tabla La Liga:", error.message);
    throw error;
  }
}

module.exports = { scrapTablaLaLiga };

const { tryMultipleSources } = require("../../utils/multiSourceScraper");
const espnSource = require("../sources/premier/espn");
const soccerwaySource = require("../sources/premier/soccerway");
const flashscoreSource = require("../sources/premier/flashscore");

const sources = [
  espnSource,
  soccerwaySource,
  flashscoreSource
];

async function scrapTablaPremier() {
  try {
    const result = await tryMultipleSources(sources, {
      selectBestBy: 'first',
      minFreshnessMinutes: 60
    });
    
    return result;
  } catch (error) {
    console.error("Error scraping tabla Premier League:", error.message);
    throw error;
  }
}

module.exports = { scrapTablaPremier };

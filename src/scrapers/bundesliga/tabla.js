const { tryMultipleSources } = require("../../utils/multiSourceScraper");
const espnSource = require("../sources/bundesliga/espn");
const soccerwaySource = require("../sources/bundesliga/soccerway");
const flashscoreSource = require("../sources/bundesliga/flashscore");

const sources = [
  espnSource,
  soccerwaySource,
  flashscoreSource
];

async function scrapTablaBundesliga() {
  try {
    const result = await tryMultipleSources(sources, {
      selectBestBy: 'first',
      minFreshnessMinutes: 60
    });
    
    return result;
  } catch (error) {
    console.error("Error scraping tabla Bundesliga:", error.message);
    throw error;
  }
}

module.exports = { scrapTablaBundesliga };

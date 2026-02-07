const axios = require("axios");
const cheerio = require("cheerio");
const randomUseragent = require("random-useragent");

async function scrapeTripAdvisorPlaces(location) {
  try {
    const url = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(
      location
    )}&searchSessionId=&searchNearby=false&geo=1&pid=3826&ssrc=e`;

    console.log(
      `\x1b[34m[TripAdvisor-Cheerio] Fetching:\x1b[0m ${url}`
    );

    const response = await axios.get(url, {
      headers: {
        "User-Agent": randomUseragent.getRandom(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        Referer: "https://www.tripadvisor.com/",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const places = [];

    // Try multiple selector strategies (TripAdvisor changes DOM frequently)
    const selectorStrategies = [
      {
        container: ".result-title",
        extract: (el) => ({
          name: $(el).text().trim(),
          description:
            $(el).closest(".location-meta-block").find(".location-description").text().trim() ||
            $(el).parent().find(".result-description").text().trim() ||
            "No description available",
          rating:
            $(el).closest(".location-meta-block").find(".ui_bubble_rating").attr("alt")?.split(" ")[0] ||
            "Not rated",
          reviewCount:
            $(el).closest(".location-meta-block").find(".review-count").text().trim() ||
            "0 reviews",
          category: "Tourist Attraction",
          imageUrl:
            $(el).closest(".location-meta-block").find("img").attr("src") ||
            $(el).closest(".location-meta-block").find("img").attr("data-src") ||
            null,
          link: $(el).attr("href")
            ? "https://www.tripadvisor.com" + $(el).attr("href")
            : null,
          source: "TripAdvisor",
        }),
      },
      {
        container: '[data-testid="search-result"]',
        extract: (el) => ({
          name:
            $(el).find('[data-testid="result-title"]').text().trim() ||
            $(el).find("h3").text().trim() ||
            $(el).find("a").first().text().trim(),
          description:
            $(el).find("p").text().trim() || "No description available",
          rating:
            $(el).find('[data-testid="rating"]').attr("aria-label")?.split(" ")[0] ||
            "Not rated",
          reviewCount:
            $(el).find('[data-testid="review-count"]').text().trim() ||
            "0 reviews",
          category: "Tourist Attraction",
          imageUrl: $(el).find("img").attr("src") || null,
          link: $(el).find("a").attr("href")
            ? "https://www.tripadvisor.com" + $(el).find("a").attr("href")
            : null,
          source: "TripAdvisor",
        }),
      },
      {
        container: ".search-results-list .result, .prw_rup.prw_search_search_result_poi",
        extract: (el) => ({
          name:
            $(el).find(".result-title").text().trim() ||
            $(el).find("a").first().text().trim(),
          description:
            $(el).find(".result-description, .location-description").text().trim() ||
            "No description available",
          rating:
            $(el).find(".ui_bubble_rating").attr("alt")?.split(" ")[0] ||
            "Not rated",
          reviewCount:
            $(el).find(".review-count").text().trim() || "0 reviews",
          category:
            $(el).find(".category-name").text().trim() || "Tourist Attraction",
          imageUrl:
            $(el).find("img").attr("src") ||
            $(el).find("img").attr("data-src") ||
            null,
          link: $(el).find("a").attr("href")
            ? "https://www.tripadvisor.com" + $(el).find("a").attr("href")
            : null,
          source: "TripAdvisor",
        }),
      },
    ];

    for (const strategy of selectorStrategies) {
      const elements = $(strategy.container);
      if (elements.length > 0) {
        console.log(
          `\x1b[32m[TripAdvisor-Cheerio] Found ${elements.length} results with selector: ${strategy.container}\x1b[0m`
        );
        elements.each((_, el) => {
          const place = strategy.extract(el);
          if (place.name && place.name !== "Unknown") {
            places.push(place);
          }
        });
        break; // Use the first matching strategy
      }
    }

    console.log(
      `\x1b[32m[TripAdvisor-Cheerio] Extracted ${places.length} places\x1b[0m`
    );
    return places;
  } catch (error) {
    console.error(
      "\x1b[31m[TripAdvisor-Cheerio] Scraping error:\x1b[0m",
      error.message
    );
    return [];
  }
}

module.exports = {
  scrapeTripAdvisorPlaces,
};

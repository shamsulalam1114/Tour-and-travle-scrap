const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require("random-useragent");
const { scrapeTripAdvisorPlaces } = require("./tripadvisor");

puppeteer.use(StealthPlugin());

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupBrowser() {
  return await puppeteer.launch({
    headless: true,
    args: [
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });
}

async function scrapeTouristPlacesPuppeteer(location) {
  const places = [];
  let browser;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      browser = await setupBrowser();
      const page = await browser.newPage();
      await page.setUserAgent(randomUseragent.getRandom());

      const url = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(
        location
      )}+attractions`;

      console.log(
        `\x1b[34m[TouristPlaces] Attempt ${attempt}/${MAX_RETRIES} — Navigating to:\x1b[0m ${url}`
      );

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Try multiple possible selectors (TripAdvisor changes frequently)
      const selectors = [
        '[data-testid="search-result"]',
        ".location-meta-block",
        ".search-results-list .result",
        ".prw_rup.prw_search_search_result_poi",
      ];

      let selectorFound = null;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 8000 });
          selectorFound = selector;
          console.log(
            `\x1b[32m[TouristPlaces] Found results with selector: ${selector}\x1b[0m`
          );
          break;
        } catch {
          continue;
        }
      }

      if (!selectorFound) {
        console.warn(
          "\x1b[33m[TouristPlaces] No known selectors matched. Page structure may have changed.\x1b[0m"
        );
        break;
      }

      const results = await page.evaluate((sel) => {
        const items = document.querySelectorAll(sel);
        return Array.from(items).map((item) => {
          // Try multiple possible child selectors
          const name =
            item.querySelector('[data-testid="result-title"]')?.innerText?.trim() ||
            item.querySelector(".result-title")?.innerText?.trim() ||
            item.querySelector("h3")?.innerText?.trim() ||
            item.querySelector("a")?.innerText?.trim() ||
            "Unknown";

          const description =
            item.querySelector(".location-description")?.innerText?.trim() ||
            item.querySelector(".search-result-description")?.innerText?.trim() ||
            item.querySelector("p")?.innerText?.trim() ||
            "No description available";

          const ratingEl =
            item.querySelector(".ui_bubble_rating") ||
            item.querySelector('[data-testid="rating"]');
          const rating = ratingEl
            ? ratingEl.getAttribute("alt")?.split(" ")[0] ||
              ratingEl.getAttribute("aria-label")?.split(" ")[0] ||
              "Not rated"
            : "Not rated";

          const reviewCount =
            item.querySelector(".review-count")?.innerText?.trim() ||
            item.querySelector('[data-testid="review-count"]')?.innerText?.trim() ||
            "0 reviews";

          const category =
            item.querySelector(".category-name")?.innerText?.trim() ||
            item.querySelector(".search-result-category")?.innerText?.trim() ||
            "Tourist Attraction";

          const imageUrl =
            item.querySelector("img")?.src ||
            item.querySelector("img")?.getAttribute("data-src") ||
            null;

          const link =
            item.querySelector("a")?.href || null;

          return {
            name,
            description,
            rating,
            reviewCount,
            category,
            imageUrl,
            link,
            source: "TripAdvisor",
          };
        });
      }, selectorFound);

      if (results.length > 0) {
        places.push(...results.filter((place) => place.name !== "Unknown"));
      }

      console.log(
        `\x1b[32m[TouristPlaces] Found ${places.length} places via Puppeteer\x1b[0m`
      );
      break; // Success, exit retry loop
    } catch (error) {
      console.error(
        `\x1b[31m[TouristPlaces] Attempt ${attempt}/${MAX_RETRIES} failed:\x1b[0m`,
        error.message
      );
      if (attempt < MAX_RETRIES) {
        console.log(
          `\x1b[33m[TouristPlaces] Retrying in ${RETRY_DELAY / 1000}s...\x1b[0m`
        );
        await delay(RETRY_DELAY);
      }
    } finally {
      if (browser) await browser.close();
    }
  }

  return places;
}

async function scrapeTouristPlaces(location) {
  console.log(
    `\x1b[34mStarting tourist places scraping for ${location}\x1b[0m`
  );

  try {
    // Run both Puppeteer and Cheerio scrapers concurrently
    const results = await Promise.allSettled([
      scrapeTouristPlacesPuppeteer(location),
      scrapeTripAdvisorPlaces(location),
    ]);

    const sourceNames = ["TripAdvisor (Puppeteer)", "TripAdvisor (Cheerio)"];
    const allResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        console.log(
          `\x1b[32m${sourceNames[index]}: Found ${result.value.length} places\x1b[0m`
        );
        return result.value;
      } else {
        console.error(
          `\x1b[31m${sourceNames[index]} failed:\x1b[0m`,
          result.reason?.message || result.reason
        );
        return [];
      }
    });

    // Merge and deduplicate by name
    const mergedPlaces = allResults.flat();
    const uniquePlaces = Array.from(
      new Map(mergedPlaces.map((place) => [place.name, place])).values()
    );

    // Sort by rating (highest first)
    const sortedPlaces = uniquePlaces.sort((a, b) => {
      const ratingA = parseFloat(a.rating) || 0;
      const ratingB = parseFloat(b.rating) || 0;
      return ratingB - ratingA;
    });

    console.log(
      `\x1b[32mFound ${sortedPlaces.length} unique tourist places\x1b[0m`
    );
    return sortedPlaces;
  } catch (error) {
    console.error(
      "\x1b[31mTourist places scraping error:\x1b[0m",
      error.message
    );
    return [];
  }
}

module.exports = {
  scrapeTouristPlaces
};

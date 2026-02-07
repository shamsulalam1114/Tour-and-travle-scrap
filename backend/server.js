require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { getAllTransportation } = require("./scrapers/transportation");
const { scrapeHotels } = require("./scrapers/hotelScrapper");
const { scrapeTouristPlaces } = require("./scrapers/tourist-places");

const app = express();
const PORT = process.env.PORT || 5000;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600000; // 1 hour default
const SCRAPE_TIMEOUT = parseInt(process.env.SCRAPE_TIMEOUT) || 120000; // 2 min default

// Structured logging helper
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const colors = {
    info: "\x1b[34m",
    success: "\x1b[32m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
  };
  const color = colors[level] || "\x1b[0m";
  const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]\x1b[0m`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests, please try again later.",
  },
});
app.use("/api/", apiLimiter);

// Cache for storing scraped data
const cache = {
  data: new Map(),
  timeout: CACHE_TTL,
};

function getCacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`;
}

function getFromCache(type, params) {
  const key = getCacheKey(type, params);
  const cached = cache.data.get(key);
  if (cached && Date.now() - cached.timestamp < cache.timeout) {
    return cached.data;
  }
  // Remove stale cache entry
  if (cached) cache.data.delete(key);
  return null;
}

function setCache(type, params, data) {
  const key = getCacheKey(type, params);
  cache.data.set(key, {
    timestamp: Date.now(),
    data,
  });
}

// Date validation helper
function isValidDate(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

// Timeout wrapper for scraping operations
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// API Routes
app.post("/api/search", async (req, res) => {
  const { from, to, checkIn, checkOut, date } = req.body;

  // Support both old (date) and new (checkIn/checkOut) formats
  const checkInDate = checkIn || date;
  const checkOutDate = checkOut || checkIn || date;

  // Validate required fields
  if (!from || !to || !checkInDate) {
    return res.status(400).json({
      error: "Missing required parameters",
      details: {
        from: !from ? "Origin location is required" : undefined,
        to: !to ? "Destination location is required" : undefined,
        checkIn: !checkInDate ? "Check-in date is required" : undefined,
      },
    });
  }

  // Validate date formats
  if (!isValidDate(checkInDate)) {
    return res.status(400).json({
      error: "Invalid check-in date format. Use YYYY-MM-DD.",
    });
  }

  if (checkOutDate && !isValidDate(checkOutDate)) {
    return res.status(400).json({
      error: "Invalid check-out date format. Use YYYY-MM-DD.",
    });
  }

  // Validate check-out is after check-in
  if (checkOutDate && new Date(checkOutDate) < new Date(checkInDate)) {
    return res.status(400).json({
      error: "Check-out date must be on or after check-in date.",
    });
  }

  try {
    // Check cache first
    const cacheParams = { from, to, checkIn: checkInDate, checkOut: checkOutDate };
    const cachedResults = getFromCache("search", cacheParams);

    if (cachedResults) {
      log("info", "Returning cached results");
      return res.json({ ...cachedResults, cached: true });
    }

    log(
      "info",
      `Starting search: ${from} → ${to}, ${checkInDate} to ${checkOutDate}`
    );

    // Fetch all data concurrently with timeout
    const [transportation, hotels, touristPlaces] = await Promise.all([
      withTimeout(
        getAllTransportation(from, to, checkInDate).catch((err) => {
          log("error", "Transportation scraping error:", err.message);
          return [];
        }),
        SCRAPE_TIMEOUT,
        "Transportation"
      ).catch((err) => {
        log("error", err.message);
        return [];
      }),
      withTimeout(
        scrapeHotels(to, checkInDate, checkOutDate).catch((err) => {
          log("error", "Hotels scraping error:", err.message);
          return [];
        }),
        SCRAPE_TIMEOUT,
        "Hotels"
      ).catch((err) => {
        log("error", err.message);
        return [];
      }),
      withTimeout(
        scrapeTouristPlaces(to).catch((err) => {
          log("error", "Tourist places scraping error:", err.message);
          return [];
        }),
        SCRAPE_TIMEOUT,
        "Tourist Places"
      ).catch((err) => {
        log("error", err.message);
        return [];
      }),
    ]);

    log("success", `Results: ${transportation.length} transport, ${hotels.length} hotels, ${touristPlaces.length} places`);

    // Construct the results object
    const results = {
      transportation: transportation || [],
      hotels: hotels || [],
      touristPlaces: touristPlaces || [],
      meta: {
        searchParams: { from, to, checkIn: checkInDate, checkOut: checkOutDate },
        timestamp: new Date().toISOString(),
        counts: {
          transportation: (transportation || []).length,
          hotels: (hotels || []).length,
          touristPlaces: (touristPlaces || []).length,
        },
      },
    };

    // Cache the results
    setCache("search", cacheParams, results);

    return res.json(results);
  } catch (error) {
    log("error", "Search error:", error.message);
    res.status(500).json({
      error: "Failed to fetch travel data",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Health check with scraper status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cacheSize: cache.data.size,
    scrapers: {
      hotels: { sources: ["Booking.com", "Agoda", "MakeMyTrip"], status: "active" },
      transportation: { sources: ["Shohoz", "Biman Airlines"], status: "active" },
      touristPlaces: { sources: ["TripAdvisor"], status: "active" },
    },
    config: {
      port: PORT,
      cacheTTL: `${CACHE_TTL / 1000}s`,
      scrapeTimeout: `${SCRAPE_TIMEOUT / 1000}s`,
    },
  });
});

// Clear cache endpoint
app.delete("/api/cache", (req, res) => {
  const size = cache.data.size;
  cache.data.clear();
  log("info", `Cache cleared (${size} entries removed)`);
  res.json({ message: `Cache cleared. ${size} entries removed.` });
});

app.listen(PORT, () => {
  log("success", `Server running on port ${PORT}`);
  log("info", `Health check: http://localhost:${PORT}/api/health`);
});

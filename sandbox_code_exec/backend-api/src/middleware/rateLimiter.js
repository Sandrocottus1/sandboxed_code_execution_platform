const rateLimit = require("express-rate-limit");

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GLOBAL_WINDOW_MINUTES = toPositiveInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MINUTES, 15);
const GLOBAL_MAX = toPositiveInt(process.env.RATE_LIMIT_GLOBAL_MAX, 300);

const SUBMIT_WINDOW_MINUTES = toPositiveInt(process.env.RATE_LIMIT_SUBMIT_WINDOW_MINUTES, 5);
const SUBMIT_MAX = toPositiveInt(process.env.RATE_LIMIT_SUBMIT_MAX, 30);

const QUERY_WINDOW_MINUTES = toPositiveInt(process.env.RATE_LIMIT_QUERY_WINDOW_MINUTES, 5);
const QUERY_MAX = toPositiveInt(process.env.RATE_LIMIT_QUERY_MAX, 300);

/**
 * Global Rate Limiter - Applies to all requests
 * Defaults to 300 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: GLOBAL_WINDOW_MINUTES * 60 * 1000,
  max: GLOBAL_MAX,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/";
  },
});

/**
 * Strict Rate Limiter for Code Submission
 * Defaults to 30 requests per 5 minutes per IP to prevent abuse
 */
const submitLimiter = rateLimit({
  windowMs: SUBMIT_WINDOW_MINUTES * 60 * 1000,
  max: SUBMIT_MAX,
  message: "Too many code submissions. Please wait before submitting again.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address as the key
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Moderate Rate Limiter for Job Status Queries
 * Defaults to 300 requests per 5 minutes per IP
 */
const queryLimiter = rateLimit({
  windowMs: QUERY_WINDOW_MINUTES * 60 * 1000,
  max: QUERY_MAX,
  message: "Too many queries. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  submitLimiter,
  queryLimiter,
};

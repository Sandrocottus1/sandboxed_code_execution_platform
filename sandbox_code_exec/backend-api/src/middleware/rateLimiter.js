const rateLimit = require("express-rate-limit");

/**
 * Global Rate Limiter - Applies to all requests
 * 15 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
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
 * 5 requests per 5 minutes per IP to prevent abuse
 */
const submitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 submissions per windowMs
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
 * 30 requests per 5 minutes per IP
 */
const queryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: "Too many queries. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  submitLimiter,
  queryLimiter,
};

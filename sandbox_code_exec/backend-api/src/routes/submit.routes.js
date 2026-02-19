const express = require("express");
const {
  submitCode,
  getJobById,
} = require("../controllers/submit.controller");
const { submitLimiter, queryLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/", submitLimiter, submitCode);
router.get("/job/:id", queryLimiter, getJobById);

module.exports = router;

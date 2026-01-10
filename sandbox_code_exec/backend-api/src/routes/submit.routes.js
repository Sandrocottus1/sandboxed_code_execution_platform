const express = require("express");
const {
  submitCode,
  getJobById,
} = require("../controllers/submit.controller");

const router = express.Router();

router.post("/", submitCode);
router.get("/job/:id", getJobById);

module.exports = router;

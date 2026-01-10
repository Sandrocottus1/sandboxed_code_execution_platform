const Job = require("../models/Job.model");
const jobQueue = require("../queue/jobQueue");

/**
 * POST /api/submit
 */
exports.submitCode = async (req, res) => {
  try {
    const { code, language ,input } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    // 1️⃣ Create DB job
    const job = await Job.create({
      code,
      language,
      status: "QUEUED",
    });

    // 2️⃣ Push to Redis queue
    await jobQueue.add("execute", {
      jobId: job._id.toString(),
      code,
      language,
      input: input || ""
    });

    // 3️⃣ Respond immediately
    res.status(200).json({ jobId: job._id });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/submit/job/:id
 */
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      status: job.status,
      output: job.output,
      language: job.language,
      createdAt: job.createdAt,
    });
  } catch (err) {
    console.error("Fetch job error:", err);
    res.status(500).json({ error: err.message });
  }
};

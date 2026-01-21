const { Queue } = require("bullmq");
const Job = require("../models/Job.model");

const myQueue = new Bull('my-queue', process.env.REDIS_URL);

queue.on("completed", async (job, result) => {
  await Job.findByIdAndUpdate(job.data.jobId, {
    status: "Completed",
    output: result.output
  });
});

queue.on("failed", async (job, err) => {
  await Job.findByIdAndUpdate(job.data.jobId, {
    status: "Failed",
    error: err.message
  });
});

module.exports = queue;

const { Queue } = require("bullmq");
const Job = require("../models/Job.model");

const queue = new Queue("code-execution", {
  connection: {
    host: "redis",
    port: 6379
  }
});

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

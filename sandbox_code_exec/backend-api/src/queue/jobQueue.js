const { Queue } = require("bullmq");
const Job = require("../models/Job.model");

const myQueue = new Queue('code-execution', {
  connection: process.env.REDIS_URL ? { url: process.env.REDIS_URL } : { host: 'redis', port: 6379 }
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

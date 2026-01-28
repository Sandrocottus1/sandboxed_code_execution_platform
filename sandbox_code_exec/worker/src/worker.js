const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const runDocker = require("./executor/runDocker");
const JobSchema = new mongoose.Schema({
    language: String,
    filepath: String,
    jobId: String,
    submittedAt: { type: Date, default: Date.now },
    startedAt: Date,
    completedAt: Date,
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "success", "error"]
    },
    output: String
});

// Checking if model exists before defining to prevent overwrite errors
const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

const http = require('http');

// This dummy server keeps Render happy so it doesn't kill the free service
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Worker is running!');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Dummy server listening on port ${PORT}`);
});

// 1. Robust DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Worker: MongoDB Connected"))
  .catch(err => console.error("❌ Worker: Mongo Connection Failed", err));

// 2. The Safe Worker
new Worker(
  "code-execution", 
  async (jobTicket) => {
    console.log(`[Job ${jobTicket.id}] Picked up. Processing...`);

    try {
      const { jobId, code, language ,input } = jobTicket.data;
      
      // Update status to RUNNING
      await Job.findByIdAndUpdate(jobId, { status: "RUNNING" });

      // Execute Code 
      console.log(`[Job ${jobTicket.id}] Sending to Docker...`);
      const executionResult = await runDocker(code,language,input);
      console.log(`[Job ${jobTicket.id}] Docker finished.`);

      // Update status to COMPLETED
      await Job.findByIdAndUpdate(jobId, { 
        status: "COMPLETED", 
        output: executionResult 
      });

      console.log(`[Job ${jobTicket.id}] ✅ Done.`);

    } catch (criticalError) {
      console.error(`[Job ${jobTicket.id}] ❌ CRASHED:`, criticalError);

      // Save the error to DB so you see it in the API response
      const { jobId } = jobTicket.data;
      await Job.findByIdAndUpdate(jobId, { 
        status: "ERROR", 
        output: JSON.stringify(criticalError.message) 
      });
    }
  },
  {
    connection: process.env.REDIS_URL || {
      host: "redis",
      port: 6379,
    },
  }
);

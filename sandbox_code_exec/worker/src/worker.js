const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const http = require("http");
const IORedis = require("ioredis");

const runCode = require("./executor/runDocker"); 

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
        enum: ["pending", "success", "error", "COMPLETED", "RUNNING"] // Added COMPLETED/RUNNING
    },
    output: String
});

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

// Dummy Server for Render
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Worker is running!');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Worker listening on port ${PORT}`));

// Redis Connection
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

// Mongo Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Worker: MongoDB Connected"))
  .catch(err => console.error("❌ Worker: Mongo Connection Failed", err));

// Worker Logic
new Worker(
  "code-execution", 
  async (jobTicket) => {
    console.log(`[Job ${jobTicket.id}] Data Received:`, jobTicket.data);
    
    const { jobId, code, language, input } = jobTicket.data;

    if (!jobId) {
        console.error(`[Job ${jobTicket.id}] ❌ ERROR: Job ID is missing! Cannot update DB.`);
        return;
    }

    try {
      console.log(`[Job ${jobTicket.id}] Updating DB to RUNNING...`);
      await Job.findByIdAndUpdate(jobId, { status: "RUNNING", startedAt: new Date() });

      console.log(`[Job ${jobTicket.id}] Executing ${language}...`);
      const executionResult = await runCode(code, language, input);

      console.log(`[Job ${jobTicket.id}] Execution Finished. Result:`, executionResult);

      console.log(`[Job ${jobTicket.id}] Updating DB to COMPLETED...`);
      const result = await Job.findByIdAndUpdate(jobId, { 
        status: "COMPLETED", 
        completedAt: new Date(),
        output: executionResult 
      });

      // Check if update actually happened
      if (!result) {
        console.error(`[Job ${jobTicket.id}] ❌ CRITICAL: Could not find Job in DB with ID: ${jobId}`);
      } else {
        console.log(`[Job ${jobTicket.id}] ✅ DB Update Successful.`);
      }

    } catch (err) {
      console.error(`[Job ${jobTicket.id}] ❌ Worker Error:`, err);
      await Job.findByIdAndUpdate(jobId, { 
        status: "ERROR", 
        output: JSON.stringify(err.message) 
      });
    }
  },
  { connection }
);

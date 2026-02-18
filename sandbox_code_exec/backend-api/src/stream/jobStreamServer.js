const IORedis = require("ioredis");
const { WebSocketServer } = require("ws");
const Job = require("../models/Job.model");

const createRedisClient = () =>
  new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const setupJobStreamServer = (server) => {
  const wss = new WebSocketServer({ server, path: "/ws/jobs" });

  wss.on("connection", (socket, request) => {
    let jobId = null;

    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      jobId = url.searchParams.get("jobId");
    } catch (err) {}

    if (!jobId) {
      socket.close(1008, "Missing jobId");
      return;
    }

    const subscriber = createRedisClient();
    const channel = `job:${jobId}`;

    const cleanup = () => {
      try {
        subscriber.unsubscribe(channel);
      } catch (err) {}
      try {
        subscriber.quit();
      } catch (err) {}
    };

    subscriber.on("message", (_channel, message) => {
      if (socket.readyState !== socket.OPEN) {
        return;
      }
      socket.send(message);
    });

    subscriber.subscribe(channel).then(async () => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "ready", jobId, timestamp: Date.now() }));
        
        // Send current job status immediately after subscribing
        try {
          const job = await Job.findById(jobId);
          if (job && job.status) {
            socket.send(JSON.stringify({ 
              type: "status", 
              status: job.status, 
              timestamp: Date.now() 
            }));
          }
        } catch (err) {
          console.error(`Error fetching initial job status for ${jobId}:`, err);
        }
      }
    });

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });

  wss.on("listening", () => {
    console.log("✅ Job stream WS ready at /ws/jobs");
  });
};

module.exports = { setupJobStreamServer };

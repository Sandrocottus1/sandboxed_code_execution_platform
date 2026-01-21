require("dotenv").config();
const app = require("./app");
const connectDB = require("./db");

const PORT = process.env.PORT || 5000;

// 1. Log to confirm Env Vars are loaded (Safety Check)
if (!process.env.MONGO_URI) {
  console.error("❌ CRITICAL ERROR: MONGO_URI is undefined. Check Render Environment variables.");
}

// 2. Start the Server FIRST
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// 3. Connect to Database Asynchronously
connectDB()
  .then(() => {
    console.log("✅ MongoDB Connection Established");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    // Optional: Only exit if the app cannot function without DB
    // process.exit(1); 
  });

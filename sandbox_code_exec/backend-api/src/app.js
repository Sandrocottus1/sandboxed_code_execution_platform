const express=require("express")
const submitRoutes=require("./routes/submit.routes");
const cors=require("cors");
const { globalLimiter } = require("./middleware/rateLimiter");

const app =express();

app.use(cors());
app.use(express.json());
app.use(globalLimiter); // Apply global rate limiting to all requests

app.use("/api/submit", submitRoutes);

app.get("/",(req,res)=>{
    res.send("Backend is alive");
})

module.exports=app;
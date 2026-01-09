const express=require("express")
const submitRoutes=require("./routes/submit.routes");

const app =express();

app.use(express.json());

app.use("/api/submit", submitRoutes);

app.get("/",(req,res)=>{
    res.send("Backend is alive");
})

module.exports=app;
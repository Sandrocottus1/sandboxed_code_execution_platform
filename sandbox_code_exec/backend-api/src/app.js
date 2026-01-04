const express=require("express")
const submitRoutes=require("./routes/submit.routes");

const app =express();

app.use(express.json());

app.use("/api", submitRoutes);

module.exports=app;
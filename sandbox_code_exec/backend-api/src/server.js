require("dotenv").config();
const app=require("./app");
const connectDB=require("./db");

connectDB();

app.listen(5000,()=>{
    console.log("API running on port 5000");
});

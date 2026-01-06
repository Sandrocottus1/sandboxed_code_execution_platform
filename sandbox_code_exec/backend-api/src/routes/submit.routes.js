const express=require("express");
const {submitCode}=require("../controllers/submit.controller");
const router=express.Router();

require.post("/subit", submitCode);

module.exports=router;
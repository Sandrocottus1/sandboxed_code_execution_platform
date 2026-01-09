const express=require("express");
const {submitCode}=require("../controllers/submit.controller");
const router=express.Router();

router.post("/", submitCode);

module.exports=router;
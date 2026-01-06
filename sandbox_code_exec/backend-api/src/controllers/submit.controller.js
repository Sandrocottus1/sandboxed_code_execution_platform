const Job =require("../models/Job.model");
const jobQueue=require("../queue/jobQueue");

exports.submitCode=async (req,res)=>{
    const {code, language}=req.body;

    const job=await Job.create({code,language});

    await jobQueue.add("execute",{
        jobId: job._id,
        code,
        language
    });

    res.json({jobId: job._id});

};
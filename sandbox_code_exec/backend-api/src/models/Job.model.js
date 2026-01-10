const mongoose =require("mongoose")

const JobSchema=new mongoose.Schema({

    code: String,
    language: String,
    input:{
        type:String,
        default:""
    },
    status: {type: String , default:"QUEUED"},
    output:String,
    createdAt: {type:Date, default: Date.now}

});

module.exports=mongoose.model("Job", JobSchema);
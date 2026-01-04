const {Queue} =require("bullmq");

const jobQueue= new Queue("code-execution",{
    connection :{
        host: "localhost",
        port:6379
    }
});

module.exports=jobQueue;
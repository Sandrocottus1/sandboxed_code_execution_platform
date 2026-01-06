const { Worker }=require("bullmq");
const runDocker=require("./executor/runDocker")
const Job=require("./models/Job.model");

new Worker(

    "code-execution",
    async job => {
        const {jobId,code}=job.data;
        const output=await runDocker(code);

        await Job.findByIdAndUpdate(jobId,{
            status:"Completed",
            output
        });
    },
    {

        connection:{
            host:"localhost",
            port: 6379
        }

    }

);
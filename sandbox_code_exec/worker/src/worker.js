const { Worker }=require("bullmq");
const runDocker=require("./executor/runDocker")
new Worker(

    "code-execution",
    async job => {
        const {jobId,code}=job.data;
        const output=await runDocker(code);

        return {output};
    },
    {

        connection:{
            host:"redis",
            port: 6379
        }

    }

);
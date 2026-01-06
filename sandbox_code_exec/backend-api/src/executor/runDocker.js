
const {exec}=require("child_process");//alllows node to run OS like commands
const fs=require("fs");//crud operations in files

module.exports=function runDocker(code){

    return new Promise((resolve)=>{
        fs.writeFileSync("/tmp/code.py",code);

        const cmd=`
            docker run --rm \  
            --cpus="0.5" \
            --memory="256m" \
            --network none \
            -v /tmp/code.py:/code.py:ro \
            python-sandbox python /code.py
            `;
            //start container
            //del container after execution
            //limit cpu usage
            // limit ram
            // disable internet
            //mount file as read only
            //custom docker image
            //run python file
        exec(cmd ,(err, stdout,stderr)=>{
            if(err)resolve(stderr);
            else resolve(stdout);
        });
    });
};
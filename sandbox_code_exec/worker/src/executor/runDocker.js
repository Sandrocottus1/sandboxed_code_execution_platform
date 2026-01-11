const { spawn } = require("child_process");

module.exports = function runDocker(code, language,input) {
  return new Promise((resolve) => {
    // 1. Encode code to Base64 to safely pass it as a command argument
    // This avoids shell escaping issues and allows us to write it to a file
    const codeBase64=Buffer.from(code).toString('base64');

   const RUNTIMES = {
      python: {
        image: "python:3.9-alpine",
        // Decode B64 -> Save File -> Run
        cmd: `echo "${codeBase64}" | base64 -d > code.py && python3 code.py`
      },
      javascript: {
        image: "node:18-alpine",
        cmd: `echo "${codeBase64}" | base64 -d > code.js && node code.js`
      },
      cpp: {
        image: "frolvlad/alpine-gxx",
        // Save to .cpp -> Compile -> Run
        cmd: `echo "${codeBase64}" | base64 -d > main.cpp && g++ -O2 main.cpp -o main && ./main`
      },
      java: {
        image: "eclipse-temurin:17-jdk-alpine",
        // Java requires the filename to match the class "Main"
        cmd: `echo "${codeBase64}" | base64 -d > Main.java && javac Main.java && java Main`
      }
};
    // Default to python if language is missing/unknown
    const config = RUNTIMES[language] || RUNTIMES.python;

    const child=spawn("docker",[
      "run", "--rm", "-i",
      "--cpus=1", "--memory=512m", "--network=none",
      config.image,
      "sh", "-c", config.cmd
    ]);

    const timeout=setTimeout(()=>{
      try{
        child.stdin.end();
        child.kill();
        console.log("COde timed out .Killing...");

      }catch(e){
        console.error("Error killing process", e);
      }
      resolve("Error :Execution Times out (12s limit)");
    },12000);

    let out = "";
    let err = "";

    if (input && input.trim().length > 0) {
        child.stdin.write(input + "\n");
    } 
    // If input is empty, we just close stdin. 
    // This causes 'cin >> x' to fail immediately (EOF) instead of hanging forever.
    child.stdin.end();

    child.stdout.on("data", (chunk) => { out += chunk.toString(); });
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      if (exitCode === 0) {
        resolve(out || "No Output returned.");
      } else {
        // If compilation fails, the error is usually in 'err'
        resolve(err || "Runtime Error (Process killed)"); 
      }
    });
  });
};
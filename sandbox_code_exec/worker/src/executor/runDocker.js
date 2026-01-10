const { spawn } = require("child_process");

// 1. Define the specific settings for each language
const RUNTIMES = {
  python: {
    image: "python:3.9-slim",
    cmd: ["python3", "-"] // '-' tells Python to read from Stdin
  },
  javascript: {
    image: "node:18-alpine",
    cmd: ["node"] // Node reads from Stdin by default
  },
  cpp: {

    image: "frolvlad/alpine-gxx",
    // 1. g++ -x c++ - : Treat stdin (-) as C++ code
    // 2. -o /tmp/a.out : Save binary to temp
    // 3. && /tmp/a.out : Run it if compile succeeds
    cmd: ["sh", "-c", "g++ -x c++ -o /tmp/a.out - && /tmp/a.out"]
  },
  java: {
    image: "openjdk:17-jdk-slim",
    // Java is strict. It needs a file on disk.
    // 1. cat > Main.java : Save stdin to file
    // 2. javac Main.java : Compile
    // 3. java Main       : Run
    cmd: ["sh", "-c", "cat > Main.java && javac Main.java && java Main"]
  }
  // Future: Add 'cpp' or 'java' here
};

module.exports = function runDocker(code, language) {
  return new Promise((resolve) => {
    
    // Default to python if language is missing/unknown
    const config = RUNTIMES[language] || RUNTIMES.python;

    const dockerArgs = [
      "run", 
      "--rm", 
      "-i",             
      "--cpus=1.0", 
      "--memory=512m", 
      "--network=none", 
      config.image,     // Dynamic Image
      ...config.cmd     // Dynamic Command
    ];

    const child = spawn("docker", dockerArgs);

    let out = "";
    let err = "";

    // Pipe the code into the container
    child.stdin.write(code);
    child.stdin.end();

    child.stdout.on("data", (chunk) => { out += chunk.toString(); });
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });

    child.on("close", (exitCode) => {
      // FIX: Prioritize output if the process finished successfully (code 0)
      // This ignores Docker "pulling" logs which appear in stderr
      if (exitCode === 0) {
        resolve(out || "No Output returned.");
      } else {
        // If exitCode is NOT 0, the code crashed or failed to run.
        // Now we really want to see the error.
        resolve(err); 
      }
    });

  }); // end Promise
};
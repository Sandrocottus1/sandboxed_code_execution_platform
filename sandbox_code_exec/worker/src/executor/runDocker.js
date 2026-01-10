const { spawn } = require("child_process");

module.exports = function runDocker(code) {
  return new Promise((resolve) => {
    // We use 'spawn' to avoid shell injection and handle streams properly
    const child = spawn("docker", [
      "run", 
      "--rm", 
      "-i",             // Interactive: Keep stdin open
      "--cpus=0.5", 
      "--memory=256m", 
      "--network=none", 
      "python:3.9-slim", // Use a standard official image
      "python3", "-"     // The '-' tells Python to read code from stdin
    ]);

    let out = "";
    let err = "";

    // Pipe the user's code directly into the container
    child.stdin.write(code);
    child.stdin.end();

    // Collect Output
    child.stdout.on("data", (chunk) => { out += chunk.toString(); });
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });

    child.on("close", () => {
      // If there's content in stderr (like syntax errors), return that
      resolve(err || out); 
    });
  });
};
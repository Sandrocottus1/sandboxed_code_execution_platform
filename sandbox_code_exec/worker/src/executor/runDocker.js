const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Helper to generate random file names
const randomId = () => Math.random().toString(36).substring(7);

module.exports = function runCode(code, language, input, onChunk) {
  return new Promise((resolve) => {
    const jobId = randomId();
    let filename = "";
    let runCommand = "";
    let args = [];

    const emit = (payload) => {
      if (typeof onChunk === "function") {
        onChunk(payload);
      }
    };

    // 1. Configure Language Settings (Local Paths)
    switch (language) {
      case "go":
        filename = path.join(__dirname, `${jobId}.go`);
        const goOut = path.join(__dirname, `${jobId}.out`);
        runCommand = "sh";
        args = ["-c", `go build -o "${goOut}" "${filename}" && "${goOut}"`];
        break;
      case "c":
        filename = path.join(__dirname, `${jobId}.c`);
        const cOut = path.join(__dirname, `${jobId}.out`);
        runCommand = "sh";
        args = ["-c", `gcc "${filename}" -o "${cOut}" && "${cOut}"`];
        break;
      case "python":
        filename = path.join(__dirname, `${jobId}.py`);
        runCommand = "python3";
        args = ["-u", filename]; // -u flag for unbuffered output
        break;
      case "javascript":
        filename = path.join(__dirname, `${jobId}.js`);
        runCommand = "sh";
        args = ["-c", `(which stdbuf > /dev/null 2>&1 && stdbuf -oL node "${filename}") || node "${filename}"`];
        break;
      case "cpp":
        // C++ is tricky without Docker. We try to compile locally.
        // Note: This might fail if 'g++' is not installed on Render's Node image.
        filename = path.join(__dirname, `${jobId}.cpp`);
        const outName = path.join(__dirname, `${jobId}.out`);
        runCommand = "sh";
        // Compile then run
        args = ["-c", `g++ "${filename}" -o "${outName}" && "${outName}"`];
        break;
      case "java":
        // Java is also tricky. Assuming 'javac' and 'java' exist.
        filename = path.join(__dirname, "Main.java"); // Java restricts filenames
        runCommand = "sh";
        args = ["-c", `javac "${filename}" && java -cp "${__dirname}" Main`];
        break;
      default:
        resolve("Error: Unsupported language");
        return;
    }

    // 2. Write the User's Code to a File
    try {
      fs.writeFileSync(filename, code);
    } catch (e) {
      resolve("Error: Could not write code file.");
      return;
    }

    // 3. Spawn the Process
    const child = spawn(runCommand, args, {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    // 4. Setup Timeout (10 seconds)
    const timeout = setTimeout(() => {
      try {
        child.kill();
        cleanup(); // Delete file
      } catch (e) {}
      resolve("Error: Execution Timed Out (10s limit)");
    }, 45000);

    let out = "";
    let err = "";

    // 5. Handle Input (stdin)
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    // 6. Capture Output
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      out += text;
      emit({ type: "output", stream: "stdout", text, timestamp: Date.now() });
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      err += text;
      emit({ type: "output", stream: "stderr", text, timestamp: Date.now() });
    });

    // 7. Cleanup Function
    const cleanup = () => {
        // Try deleting the source file
        if (fs.existsSync(filename)) fs.unlinkSync(filename);
      // If compiled language, try deleting the executable
      if (["cpp", "c", "go"].includes(language) && fs.existsSync(path.join(__dirname, `${jobId}.out`))) {
            fs.unlinkSync(path.join(__dirname, `${jobId}.out`));
        }
        // If Java, try deleting the class file
        if (language === 'java' && fs.existsSync(path.join(__dirname, "Main.class"))) {
            fs.unlinkSync(path.join(__dirname, "Main.class"));
        }
    };

    // 8. On Process Exit
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      cleanup();
      emit({ type: "end", exitCode, timestamp: Date.now() });
      const finalOutput = (out + "\n" + err).trim();
      if (exitCode === 0) {
        resolve(out || "No Output.");
      } else {
        resolve(err || out || "Runtime Error.");
      }
    });
    
    // Handle spawn errors (e.g., if python3 is missing)
    child.on("error", (error) => {
        clearTimeout(timeout);
        cleanup();
      emit({ type: "error", message: error.message, timestamp: Date.now() });
        resolve(`Execution Error: ${error.message} (Is the language installed?)`);
    });
  });
};

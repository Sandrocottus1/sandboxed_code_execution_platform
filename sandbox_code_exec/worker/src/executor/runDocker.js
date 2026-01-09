const { exec } = require("child_process");
const fs = require("fs");

module.exports = function runDocker(code) {
  return new Promise((resolve) => {
    fs.writeFileSync("/tmp/code.py", code);

    const cmd = `
      docker run --rm \
      --cpus="0.5" \
      --memory="256m" \
      --network none \
      -v /tmp/code.py:/code.py:ro \
      python-sandbox python /code.py
    `;

    exec(cmd, (err, stdout, stderr) => {
      if (err) resolve(stderr);
      else resolve(stdout);
    });
  });
};

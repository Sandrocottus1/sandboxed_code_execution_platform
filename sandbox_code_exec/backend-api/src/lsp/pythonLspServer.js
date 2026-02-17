const { spawn } = require("child_process");
const {
  WebSocketMessageReader,
  WebSocketMessageWriter,
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
  forward,
} = require("vscode-ws-jsonrpc");
const { WebSocketServer } = require("ws");

const startPyright = () => spawn("pyright-langserver", ["--stdio"]);

const setupPythonLspServer = (server) => {
  const wss = new WebSocketServer({ server, path: "/lsp/python" });

  wss.on("connection", (socket) => {
    const socketReader = new WebSocketMessageReader(socket);
    const socketWriter = new WebSocketMessageWriter(socket);
    const socketConnection = createMessageConnection(socketReader, socketWriter);

    const pyrightProcess = startPyright();
    const serverReader = new StreamMessageReader(pyrightProcess.stdout);
    const serverWriter = new StreamMessageWriter(pyrightProcess.stdin);
    const serverConnection = createMessageConnection(serverReader, serverWriter);

    forward(socketConnection, serverConnection, (message) => message);

    const cleanup = () => {
      try {
        socketConnection.dispose();
      } catch (err) {}
      try {
        serverConnection.dispose();
      } catch (err) {}
      if (pyrightProcess && !pyrightProcess.killed) {
        pyrightProcess.kill();
      }
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
    pyrightProcess.on("exit", cleanup);
  });

  wss.on("listening", () => {
    console.log("✅ Python LSP ready at /lsp/python");
  });
};

module.exports = { setupPythonLspServer };

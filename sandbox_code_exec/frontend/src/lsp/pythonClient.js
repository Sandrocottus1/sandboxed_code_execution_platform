import {
  CloseAction,
  ErrorAction,
  MonacoLanguageClient,
  MonacoServices,
  createConnection,
} from "monaco-languageclient";
import {
  WebSocketMessageReader,
  WebSocketMessageWriter,
  toSocket,
} from "vscode-ws-jsonrpc";

const toWsUrl = (httpUrl) => httpUrl.replace(/^http/, "ws");

export const setupPythonLanguageClient = (monaco, apiUrl, clientRef) => {
  if (clientRef.current) {
    return;
  }

  MonacoServices.install(monaco);

  const webSocket = new WebSocket(`${toWsUrl(apiUrl)}/lsp/python`);

  webSocket.onopen = () => {
    const socket = toSocket(webSocket);
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);

    const languageClient = new MonacoLanguageClient({
      name: "Python Language Client",
      clientOptions: {
        documentSelector: ["python"],
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.Restart,
        },
      },
      connectionProvider: {
        get: (errorHandler, closeHandler) =>
          Promise.resolve(createConnection(reader, writer, errorHandler, closeHandler)),
      },
    });

    clientRef.current = languageClient;
    languageClient.start();
    reader.onClose(() => languageClient.stop());
  };

  webSocket.onclose = () => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
  };
};

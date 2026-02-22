import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import "./App.css";

const toWsUrl = (httpUrl) => httpUrl.replace(/^http/, "ws");

const SUPPORTED_LANGUAGES = ["go", "c", "python", "javascript", "cpp", "java"];

const getInitialLanguage = () => {
  if (typeof window === "undefined") {
    return "python";
  }

  return localStorage.getItem("active_language") || "python";
};

const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  return localStorage.getItem("active_theme") || "dark";
};

const getDefaultCodeTemplate = (language) => {
  switch (language) {
    case "go":
      return `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}`;
    case "c":
      return `#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}`;
    case "cpp":
      return `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}`;
    case "java":
      return `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`;
    case "javascript":
      return `console.log("Hello World");`;
    case "python":
    default:
      return `print("Hello World")`;
  }
};

const getInitialCodeByLanguage = () => {
  const initialCode = {};

  SUPPORTED_LANGUAGES.forEach((lang) => {
    if (typeof window !== "undefined") {
      const savedCode = localStorage.getItem(`autosave_${lang}`);
      initialCode[lang] = savedCode ?? getDefaultCodeTemplate(lang);
      return;
    }

    initialCode[lang] = getDefaultCodeTemplate(lang);
  });

  return initialCode;
};

const SunIcon = () => (
  <svg
    className="theme-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path
      d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    className="theme-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M20.5 14.5a7.5 7.5 0 1 1-8-11 8.5 8.5 0 1 0 8 11z"
      fill="currentColor"
    />
  </svg>
);

function App() {
  const [codeByLanguage, setCodeByLanguage] = useState(getInitialCodeByLanguage);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState(null);
  const monacoInitializedRef = useRef(false);
  const monacoEditorRef = useRef(null);
  const monacoRef = useRef(null);
  const languageModelsRef = useRef({});
  const outputStreamRef = useRef(null);
  const streamFinishedRef = useRef(false);

  const API_URL = "https://sandboxed-code-execution-platform.onrender.com";
  const activeCode = codeByLanguage[language] ?? getDefaultCodeTemplate(language);

  const persistCodeForLanguage = (lang, value) => {
    setCodeByLanguage((prev) => ({
      ...prev,
      [lang]: value,
    }));

    if (typeof window !== "undefined") {
      localStorage.setItem(`autosave_${lang}`, value);
    }
  };

  const handleResetSavedCode = () => {
    const defaultCodeByLanguage = {};

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const template = getDefaultCodeTemplate(lang);
      defaultCodeByLanguage[lang] = template;

      if (typeof window !== "undefined") {
        localStorage.setItem(`autosave_${lang}`, template);
      }

      const model = languageModelsRef.current[lang];
      if (model) {
        model.setValue(template);
      }
    });

    setCodeByLanguage(defaultCodeByLanguage);
    setOutput("");
    setStatus("Idle");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_language", language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.dataset.theme = theme;
      localStorage.setItem("active_theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (!monacoEditorRef.current || !monacoRef.current) {
      return;
    }

    let model = languageModelsRef.current[language];
    if (!model) {
      const uri = monacoRef.current.Uri.parse(`inmemory://model/${language}`);
      model = monacoRef.current.editor.createModel(activeCode, language, uri);
      languageModelsRef.current[language] = model;
    }

    if (model.getValue() !== activeCode) {
      model.setValue(activeCode);
    }

    monacoEditorRef.current.setModel(model);
  }, [language, activeCode]);


  // Handling code submission
  const handleSubmit = async () => {
    setOutput("");
    setStatus("QUEUED");
    
    try {
      const { data } = await axios.post(`${API_URL}/api/submit`, {
        code: activeCode,
        language,
        input
      });
      setJobId(data.jobId);
      setStatus("RUNNING"); // Optimistically show RUNNING
      startOutputStream(data.jobId);
    } catch (err) {
      setOutput(err.response?.data?.error || "Submission failed");
      setStatus("ERROR");
    }
  };

  const startOutputStream = (id) => {
    if (outputStreamRef.current) {
      outputStreamRef.current.close();
      outputStreamRef.current = null;
    }

    streamFinishedRef.current = false;

    const ws = new WebSocket(`${toWsUrl(API_URL)}/ws/jobs?jobId=${id}`);
    outputStreamRef.current = ws;

    const fallbackTimer = setTimeout(() => {
      if (!streamFinishedRef.current && ws.readyState !== WebSocket.OPEN) {
        pollJobStatus(id);
      }
    }, 1500);

    ws.onopen = () => {
      // Don't set status here - wait for actual status from backend
    };

    ws.onmessage = (event) => {
      let payload = null;

      try {
        payload = JSON.parse(event.data);
      } catch (err) {
        setOutput((prev) => prev + event.data);
        return;
      }

      if (payload.type === "output") {
        const prefix = payload.stream === "stderr" ? "[stderr] " : "[stdout] ";
        setOutput((prev) => prev + prefix + payload.text);
        return;
      }

      if (payload.type === "status" && payload.status) {
        setStatus(payload.status);
        return;
      }

      if (payload.type === "end") {
        streamFinishedRef.current = true;
        setStatus(payload.exitCode === 0 ? "COMPLETED" : "ERROR");
        ws.close();
      }
    };

    const handleStreamClose = () => {
      clearTimeout(fallbackTimer);
      if (!streamFinishedRef.current) {
        pollJobStatus(id);
      }
    };

    ws.onclose = handleStreamClose;
    ws.onerror = handleStreamClose;
  };

  // Polling status
  const pollJobStatus = async (id) => {
    const intervalId = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/submit/job/${id}`);
        console.log("Job Status: ", data.status);

        if (data.status === "COMPLETED" || data.status === "ERROR") {
          clearInterval(intervalId);
          setOutput(data.output);
          setStatus(data.status);
        }
      } catch (err) {
        clearInterval(intervalId);
        setOutput("Error polling job status");
        setStatus("ERROR");
      }
    }, 1000);
  };

  const statusClass = status === "ERROR"
    ? "status-pill is-error"
    : status === "COMPLETED"
    ? "status-pill is-success"
    : status === "RUNNING"
    ? "status-pill is-running"
    : "status-pill";

  const setupIntellisense = (monaco) => {
    if (monacoInitializedRef.current) {
      return;
    }

    monacoInitializedRef.current = true;

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      lib: ["es2020", "dom"],
      target: monaco.languages.typescript.ScriptTarget.ES2020,
    });

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `declare const require: (path: string) => any;
declare const module: { exports: any };
declare const process: { env: Record<string, string | undefined> };
declare const __dirname: string;
declare const __filename: string;`,
      "ts:node-globals.d.ts"
    );

    const toSuggestion = (label, kind, insertText) => ({
      label,
      kind,
      insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    });

    const pythonBuiltins = [
      "abs",
      "all",
      "any",
      "bool",
      "dict",
      "enumerate",
      "float",
      "int",
      "len",
      "list",
      "map",
      "max",
      "min",
      "print",
      "range",
      "set",
      "sorted",
      "str",
      "sum",
      "tuple",
      "zip",
    ];

    const pythonKeywords = [
      "def",
      "class",
      "return",
      "import",
      "from",
      "as",
      "if",
      "elif",
      "else",
      "while",
      "try",
      "except",
      "with",
      "lambda",
    ];

    const completionSets = {
      javascript: [
        toSuggestion(
          "console.log",
          monaco.languages.CompletionItemKind.Function,
          "console.log(${1});"
        ),
        toSuggestion(
          "fetch",
          monaco.languages.CompletionItemKind.Function,
          "fetch(${1:url}).then(res => res.json()).then(data => {\n  ${2}\n});"
        ),
        toSuggestion(
          "for",
          monaco.languages.CompletionItemKind.Snippet,
          "for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n  ${3}\n}"
        ),
        toSuggestion(
          "async function",
          monaco.languages.CompletionItemKind.Snippet,
          "async function ${1:name}(${2:args}) {\n  ${3}\n}"
        ),
        toSuggestion(
          "try/catch",
          monaco.languages.CompletionItemKind.Snippet,
          "try {\n  ${1}\n} catch (${2:err}) {\n  ${3}\n}"
        ),
      ],
      python: [
        ...pythonBuiltins.map((name) =>
          toSuggestion(name, monaco.languages.CompletionItemKind.Function, `${name}(${1})`)
        ),
        ...pythonKeywords.map((keyword) =>
          toSuggestion(keyword, monaco.languages.CompletionItemKind.Keyword, keyword)
        ),
        {
          ...toSuggestion(
            "for",
            monaco.languages.CompletionItemKind.Snippet,
            "for ${1:i} in range(${2:n}):\n    ${3}"
          ),
          sortText: "0000",
        },
        {
          ...toSuggestion(
            "def",
            monaco.languages.CompletionItemKind.Snippet,
            "def ${1:func}(${2:args}):\n    ${3}"
          ),
          sortText: "0001",
        },
        {
          ...toSuggestion(
            "if",
            monaco.languages.CompletionItemKind.Snippet,
            "if ${1:condition}:\n    ${2}\nelse:\n    ${3}"
          ),
          sortText: "0002",
        },
        {
          ...toSuggestion(
            "elif",
            monaco.languages.CompletionItemKind.Snippet,
            "elif ${1:condition}:\n    ${2}"
          ),
          sortText: "0003",
        },
        {
          ...toSuggestion(
            "while",
            monaco.languages.CompletionItemKind.Snippet,
            "while ${1:condition}:\n    ${2}"
          ),
          sortText: "0004",
        },
        {
          ...toSuggestion(
            "try",
            monaco.languages.CompletionItemKind.Snippet,
            "try:\n    ${1}\nexcept ${2:Exception} as ${3:e}:\n    ${4}"
          ),
          sortText: "0005",
        },
        {
          ...toSuggestion(
            "with",
            monaco.languages.CompletionItemKind.Snippet,
            "with ${1:open(${2:\"file.txt\"})} as ${3:f}:\n    ${4}"
          ),
          sortText: "0006",
        },
        {
          ...toSuggestion(
            "class",
            monaco.languages.CompletionItemKind.Snippet,
            "class ${1:ClassName}(${2:object}):\n    def __init__(self, ${3:args}):\n        ${4:pass}"
          ),
          sortText: "0007",
        },
        {
          ...toSuggestion(
            "list comprehension",
            monaco.languages.CompletionItemKind.Snippet,
            "[${1:expr} for ${2:x} in ${3:iterable}]"
          ),
          sortText: "0008",
        },
        {
          ...toSuggestion(
            "dict comprehension",
            monaco.languages.CompletionItemKind.Snippet,
            "{${1:key}: ${2:value} for ${3:k}, ${4:v} in ${5:iterable}}"
          ),
          sortText: "0009",
        },
        {
          ...toSuggestion(
            "f-string",
            monaco.languages.CompletionItemKind.Snippet,
            "f\"${1:var} = {${2:value}}\""
          ),
          sortText: "0010",
        },
      ],
      go: [
        {
          label: "fmt.Println",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "fmt.Println(${1})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: "main",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "func main() {\n    ${1}\n}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ],
      c: [
        {
          label: "printf",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "printf(\"${1}\\n\");",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: "main",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "int main() {\n    ${1}\n    return 0;\n}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ],
      cpp: [
        {
          label: "cout",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "std::cout << ${1} << std::endl;",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: "main",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "int main() {\n    ${1}\n    return 0;\n}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ],
      java: [
        {
          label: "System.out.println",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "System.out.println(${1});",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: "main",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "public static void main(String[] args) {\n    ${1}\n}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ],
    };

    Object.entries(completionSets).forEach(([lang, suggestions]) => {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: () => ({ suggestions }),
      });
    });
  };

  return (
    <div className="app">
      <div className="app-shell">
        <header className="app-header">
          <div className="title-block">
            <h1>Remote Code Executor</h1>
            <p>Run code securely in the cloud with live output.</p>
          </div>
          <div className="control-panel">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="theme-toggle"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select"
            >
              <option value="go">Go</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="javascript">Javascript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <button
              onClick={handleSubmit}
              disabled={status === "Processing..."}
              className="run-btn"
            >
              {status === "Processing..." ? "Running..." : "Run Code"}
            </button>
            <button
              type="button"
              onClick={handleResetSavedCode}
              className="run-btn"
            >
              Reset Saved Code
            </button>
          </div>
        </header>

        <div className="workspace">
          <section className="editor-panel">
            <div className="panel-header">
              <h2>Editor</h2>
              <span className="hint">Autosaves by language</span>
            </div>
            <div className="editor-box">
              <Editor
                height="100%"
                defaultLanguage="python"
                language={language}
                onChange={(value) => {
                  const nextCode = value ?? "";
                  const modelLanguage = monacoEditorRef.current?.getModel()?.getLanguageId() || language;
                  persistCodeForLanguage(modelLanguage, nextCode);
                }}
                onMount={(editor, monaco) => {
                  monacoEditorRef.current = editor;
                  monacoRef.current = monaco;

                  SUPPORTED_LANGUAGES.forEach((lang) => {
                    const existingModel = languageModelsRef.current[lang];
                    if (existingModel) {
                      return;
                    }

                    const initialCode = codeByLanguage[lang] ?? getDefaultCodeTemplate(lang);
                    const uri = monaco.Uri.parse(`inmemory://model/${lang}`);
                    const model = monaco.editor.createModel(initialCode, lang, uri);
                    languageModelsRef.current[lang] = model;
                  });

                  const model = languageModelsRef.current[language];
                  editor.setModel(model);
                  
                  setupIntellisense(monaco);
                }}
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  tabCompletion: "on",
                  inlineSuggest: { enabled: true },
                  acceptSuggestionOnEnter: "on",
                  suggestSelection: "first",
                  wordBasedSuggestions: "off",
                }}
              />
            </div>
          </section>

          <section className="side-panel">
            <div className="panel-card input-section">
              <div className="panel-header">
                <h3>Input (stdin)</h3>
                <span className="pill">Optional</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your input here..."
              />
            </div>

            <div className="panel-card output-section">
              <div className="panel-header">
                <h3>Output</h3>
                <span className={statusClass}>{status || "Idle"}</span>
              </div>
              <pre className={status === "ERROR" ? "error-text" : ""}>
                {output || "Output will appear here..."}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import "./App.css";

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
  const [code, setCode] = useState("// Write your code here...");
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("python");
  const [theme, setTheme] = useState("dark");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState(null);
  const monacoInitializedRef = useRef(false);

  const API_URL = "https://sandboxed-code-execution-platform.onrender.com";

  //Loading the Saved language on initial mount

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("active_language");
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    }
  }, []); // Runs once on mount

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("active_theme");
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

  // Saving the LANGUAGE whenever it changes
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


  // This runs only when the 'language' changes or on first load.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCode = localStorage.getItem(`autosave_${language}`);
      
      if (savedCode) {
        setCode(savedCode);
      } else {
        // Now this function actually exists!
        setCode(getDefaultCodeTemplate(language)); 
      }
    }
  }, [language]);

  // Saves automatically 500ms after you stop typing.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`autosave_${language}`, code);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [code, language]);


  // Handling code submission
  const handleSubmit = async () => {
    setOutput("");
    setStatus("Queueing...");
    
    try {
      const { data } = await axios.post(`${API_URL}/api/submit`, {
        code,
        language,
        input
      });
      setJobId(data.jobId);
      setStatus("Processing...");
      pollJobStatus(data.jobId);
    } catch (err) {
      setOutput(err.response?.data?.error || "Submission failed");
      setStatus("Error");
    }
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
        setStatus("Error");
      }
    }, 1000);
  };

  const statusClass = status === "ERROR"
    ? "status-pill is-error"
    : status === "COMPLETED"
    ? "status-pill is-success"
    : status === "Processing..."
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
      "for",
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
        toSuggestion(
          "for",
          monaco.languages.CompletionItemKind.Snippet,
          "for ${1:i} in range(${2:n}):\n    ${3}"
        ),
        toSuggestion(
          "def",
          monaco.languages.CompletionItemKind.Snippet,
          "def ${1:func}(${2:args}):\n    ${3}"
        ),
        toSuggestion(
          "if",
          monaco.languages.CompletionItemKind.Snippet,
          "if ${1:condition}:\n    ${2}\nelse:\n    ${3}"
        ),
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
                value={code}
                onChange={(value) => setCode(value)}
                onMount={(_, monaco) => setupIntellisense(monaco)}
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
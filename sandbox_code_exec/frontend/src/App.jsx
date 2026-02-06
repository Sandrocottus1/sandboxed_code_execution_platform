import { useEffect, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import "./App.css";

const getDefaultCodeTemplate = (language) => {
  switch (language) {
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
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span className="theme-label">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select"
            >
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
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
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
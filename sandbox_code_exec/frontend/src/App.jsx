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

function App() {
  const [code, setCode] = useState("// Write your code here...");
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("python");
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

  // Saving the LANGUAGE whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_language", language);
    }
  }, [language]);


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

  return (
    <div className="container">
      <h1>Remote Code Executor</h1>
      <div className="control-panel">
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
      <div className="editor-layout">
        <div className="editor-box">
          <Editor
            height="100%"
            defaultLanguage="python"
            language={language}
            value={code}
            onChange={(value) => setCode(value)}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <div className="io-box">
          <div className="input-section">
            <h3>Input (stdin)</h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your input here..."
            />
          </div>
          <div className="output-section">
            <h3>Output</h3>
            <pre className={status === "ERROR" ? "error-text" : ""}>
              {output || "Output will appear here...!"}
            </pre>
            <span className="status-badge">Status: {status || "Idle"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
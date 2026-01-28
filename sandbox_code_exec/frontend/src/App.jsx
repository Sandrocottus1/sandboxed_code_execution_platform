import {useEffect, useState} from "react";
import axios from "axios";
import Editor from "@monaco-editor/react"
import "./App.css";

function App(){

  const [code,setCode]=useState("//Write your code here...");
  const [input,setInput]=useState("");
  const [language,setLanguage]=useState("python");
  const [output,setOutput]=useState("");
  const [status,setStatus]=useState("");
  const [jobId, setJobId]=useState(null);

  const API_URL = "https://sandboxed-code-execution-platform.onrender.com";
  
  //Load : running this once when the page loads;

  useEffect(() => {

    if( typeof window!=="undefined"){
      const savedCode=localStorage.getItem("autosave_code");
      const savedOutput=localStorage.getItem("autosave_output");
      if(savedCode) setCode(savedCode);
      if(savedOutput) setOutput(savedOutput);
    }
  } ,[])


  //Save: run this ever time 'code' or 'output' changes

  useEffect(() => { 
    if(typeof window!=="undefined"){
      localStorage.setItem("autosave_code",code);
      localStorage.setItem("autosave_output",output);
    }
    } ,[code,output]);


    //Load code specific to the current language

    useEffect(() => {
      const savedCode=localStorage.getItem(`autosave_${language}`);
      if(savedCode){
        setCode(savedCode);
      }else{
        //if no saved code ,set a default template
        setCode(getDefaultCodeTemplate(language));  
      }

    } ,[language]);//run whenever the language changes


   // Save code specific to the curr language

   useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`autosave_${language}`, code);
    }, 500); // Debounce: Save only after user stops typing for 0.5s to save performance

    return () => clearTimeout(timeoutId);
  }, [code, language]);


    //hanlding code submission
  const handleSubmit =async()=>{
    setOutput("");
    setStatus("Queueing...");
    //submition of code
    try{
      const {data}=await axios.post(`${API_URL}/api/submit`,{
        code,
        language,
        input
      });
      setJobId(data.jobId);
      setStatus("Processing...");
      pollJobStatus(data.jobId);
    }catch(err){
      setOutput(err.response?.data?.error || "submission failed");
      setStatus("Error");
    }
  };

  //polling status everysecond
  const pollJobStatus =async(id)=>{
    const intervalId=setInterval(async()=>{
      try{
        const {data}=await axios.get(`${API_URL}/api/submit/job/${id}`);
        console.log("Job Status: ", data.status);

        if(data.status=="COMPLETED"||data.status=="ERROR"){
          clearInterval(intervalId);
          setOutput(data.output);
          setStatus(data.status);
        }
      }catch(err){
          clearInterval(intervalId);
          setOutput("Error polling job status");
          setStatus("Error");
      }
    },1000);
  };
  return (

    <div className="container">
        <h1>Remote Code Executor</h1>
        <div className="control-panel">
          <select 
            value={language} onChange={(e)=>setLanguage(e.target.value)}
            className="lang-select">

              <option value="python">Python</option>
              <option value="javascript">Javascript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
          </select>
          <button onClick={handleSubmit}
          disabled={status==="Processing..."}
          className="run-btn"
          >
           {status==="Processing..."? "Running...":"Run Code"} 
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
                onChange={(e)=>setInput(e.target.value)}
                placeholder="Enter your input here..."
              />
            </div>
            <div className="output-section">
              <h3>Output</h3>
              <pre className={status=="ERROR"?"error-text": ""}>
                {output || "Output will appear here...!"}
              </pre>
              <span className="status-badge">Status :{status || "Idle"}</span>
            </div>
          </div>
        </div>
    </div>
  );
}

export default App;

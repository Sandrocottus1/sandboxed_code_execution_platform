🚀 Remote Code Execution Engine (RCE)

A high-performance, secure, and scalable remote code execution engine capable of running code in Python, C++, Java, and JavaScript safely using Docker containers. Designed with a microservices architecture to ensure resilience, security, and scalability.
🌟 Key Features
• Multi-Language Support: Execute code in Python (3.9), C++ (GCC/Alpine), Java (OpenJDK), and Node.js.
• Secure Sandboxing: Each code submission runs in an isolated, ephemeral Docker container with no network access (--network none) and strict resource limits (CPU/RAM).
• Asynchronous Processing: Uses Redis and BullMQ for efficient job queuing, preventing server blockage during heavy loads.
• Real-time Polling: Frontend polls job status for immediate feedback (Queued → Processing → Completed/Error).
• Robust Error Handling: Handles timeouts (infinite loops), compilation errors, and runtime crashes gracefully.
• Standard Input (Stdin): Full support for interactive programs (e.g., cin >> x or input()).

🛠️ Tech Stack
Frontend: React.js, Vite, Monaco Editor  
Backend: Node.js, Express.js  
Task Queue: BullMQ, Redis  
Database: MongoDB  
Infrastructure: Docker, Docker Compose

📂 Architecture Overview
The system consists of three main services orchestrated via Docker Compose:
• Backend API (Port 5000): Handles code submission, validation, MongoDB storage, and Redis queueing.
• Worker Service: Executes code inside Docker containers and updates job results.
• Frontend (Port 5173): React-based UI for writing, executing, and viewing results.

🚀 Getting Started
Prerequisites:
• Docker Desktop
• Node.js (optional)
Installation:
git clone https://github.com/Sandrocottus1/remote-code-executor.git
cd remote-code-executor

Run Backend:
docker compose up -d --build
Run Frontend:
cd frontend
npm install
npm run dev
Access:
http://localhost:5173

🧪 Usage Guide
1. Select language
2. Write code
3. Provide input
4. Run
5. View output

🛡️ Security Measures
• Ephemeral Containers
• Timeouts (10–12 seconds)
• Resource Caps (1 CPU, 512MB RAM)
• Network Isolation
• Read-only filesystem

🔮 Future Improvements
• JWT Authentication
• More language support
• Online Judge test cases
• WebSocket-based updates


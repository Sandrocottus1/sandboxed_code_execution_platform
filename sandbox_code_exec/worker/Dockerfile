# Start with a lightweight Node.js image
FROM node:18-slim

# Install the missing compilers: Python, G++ (for C++), and OpenJDK (for Java)
RUN apt-get update && apt-get install -y \
    python3 \
    g++ \
    gcc \
    default-jdk \
    golang \
    && rm -rf /var/lib/apt/lists/*

# Set up the worker app
WORKDIR /app

# Copy dependency files first (for faster builds)
COPY package*.json ./
RUN npm install

# Copy the rest of the worker code
COPY . .

# Start the worker
CMD ["node", "src/worker.js"]

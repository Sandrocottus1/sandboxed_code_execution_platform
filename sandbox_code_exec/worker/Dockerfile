FROM node:20

WORKDIR /worker
COPY package*.json ./
RUN npm install

COPY . .
CMD ["node", "src/worker.js"]

# /worker/Dockerfile
FROM node:20

# 1. Install curl so we can download files
RUN apt-get update && apt-get install -y curl

# 2. Download the LATEST Docker CLI manually
# This gets the official binary which is always up-to-date
RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-26.1.3.tgz -o docker.tgz \
    && tar xzvf docker.tgz --strip 1 -C /usr/local/bin docker/docker \
    && rm docker.tgz

WORKDIR /worker

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "src/worker.js"]
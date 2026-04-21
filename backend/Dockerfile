FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends   openjdk-17-jre-headless bash   && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
EXPOSE 8080
CMD ["node", "src/index.js"]

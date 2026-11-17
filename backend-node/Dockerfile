FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=5000 DB_PATH=/data/jobtracker.db
EXPOSE 5000
CMD ["node", "src/server.js"]

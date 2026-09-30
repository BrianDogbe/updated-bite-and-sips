FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
ENV PORT=4000 DB_FILE=/data/bite-and-sips.db
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "dist/index.js"]

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

EXPOSE 5000
USER node
CMD ["node", "index.js"]

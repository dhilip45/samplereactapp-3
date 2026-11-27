FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --chown=node:node . .
RUN chmod -R u+rwX,go+rX /app

EXPOSE 5000
USER node
CMD ["node", "index.js"]

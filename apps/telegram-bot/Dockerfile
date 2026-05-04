# syntax=docker/dockerfile:1
FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY apps/telegram-bot/package.json ./
RUN pnpm install --frozen-lockfile

COPY apps/telegram-bot/src/ ./src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "src/index.js"]

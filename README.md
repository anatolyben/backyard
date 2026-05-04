# backyard

A boilerplate for spinning up a production-ready backend environment
on a cloud server. Docker, Postgres, Redis, Node.js — configured and wired
together. Clone it, run one script, start building.

Includes a working Telegram bot as the example app. When /ping returns
pong, your entire stack is working.

---

## Quick start

On a fresh Ubuntu VPS:

    bash setup.sh

Then edit .env:

    BOT_TOKEN=your_telegram_bot_token
    POSTGRES_PASSWORD=choose_a_strong_password
    REDIS_PASSWORD=choose_a_strong_password

Then start the stack:

    docker compose up -d

Send /ping to your bot in Telegram. It replies pong. You are done.

---

## What setup.sh does

For people who want to understand before running:

1. Checks if Docker is installed. If not, installs it using the
   official Docker install script (get.docker.com). Enables and
   starts the Docker service.

2. Checks if the Docker Compose plugin is installed. If not,
   installs it via apt.

3. Copies .env.example to .env if .env does not already exist.

4. Prints next steps.

The script is idempotent — safe to run more than once. It skips
any step that is already complete.

---

## Stack

Postgres — primary database. Data persists in a Docker volume.

Redis — cache and pub/sub. Password protected. Data persists
in a Docker volume.

Node.js — runtime for all apps. Alpine base image for small
container size.

---

## Project structure

    apps/          one folder per service
    docker-compose.yml
    setup.sh       run once on a fresh VPS
    .env.example   copy to .env and fill in

---

## Commands

    docker compose up -d      start all containers detached
    docker compose down       stop containers, keep data
    docker compose down -v    stop containers, delete all data
    docker compose logs -f    tail all logs
    docker compose logs -f telegram-bot    tail one service

---

## Adding a new app

1. Create apps/<name>/
2. Copy Dockerfile from apps/telegram-bot/Dockerfile
   Update the COPY path to match your app name
3. Create package.json with "type": "module"
4. Copy src/utils/logger.js exactly — do not modify
5. Copy src/db.js — add your tables to migrate()
6. Write src/index.js
7. Add a service block to docker-compose.yml:

       your-app:
         build:
           context: .
           dockerfile: apps/your-app/Dockerfile
         image: backyard-your-app:latest
         container_name: backyard-your-app
         env_file: .env
         environment:
           - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
           - PGHOST=postgres
           - PGPORT=5432
           - PGDATABASE=backyard
           - PGUSER=postgres
           - PGPASSWORD=${POSTGRES_PASSWORD}
         mem_limit: 256m
         cpus: "0.5"
         depends_on:
           redis:
             condition: service_healthy
           postgres:
             condition: service_healthy
         restart: unless-stopped

8. Run: docker compose up -d

---

## Logging

All apps use pino for structured logging. Never use console.log.

    import { logger } from "./utils/logger.js";

    logger.info({ chatId, userId }, "message received");
    logger.warn({ err }, "something failed but recoverable");
    logger.error({ err }, "something failed");

Structured context goes in the first argument as an object.
The message string is always the second argument.

---

## Database

Use the query() helper. Never create a second connection pool.
Always use parameterized queries.

    import { query } from "./db.js";

    await query(
      "INSERT INTO events (chat_id, user_id) VALUES ($1, $2)",
      [chatId, userId],
    );

To add a new table, add a CREATE TABLE IF NOT EXISTS block to
migrate() in db.js. It runs on every boot and is idempotent.

---

## Redis

The client is created in index.js. Pass it to functions that need it.
Never create a second client.

    await redis.set("some-key", value, { EX: 3600 });
    const val = await redis.get("some-key");

---

## Secrets

All secrets live in .env. Never hardcode them. Never commit .env.

BOT_TOKEN        — Telegram bot token from @BotFather
POSTGRES_PASSWORD — Postgres password, used by all services
REDIS_PASSWORD    — Redis password, used by all services

Add new secrets to .env and .env.example together.
Reference them in docker-compose.yml via ${VARIABLE_NAME}.

---

## Graceful shutdown

Every app handles SIGTERM. SIGINT re-emits SIGTERM.

    process.on("SIGTERM", async () => {
      logger.info("shutting down");
      // stop your service
      if (redis.isOpen) await redis.quit().catch(() => {});
      process.exit(0);
    });

    process.on("SIGINT", () => process.emit("SIGTERM"));

---

## Verification

After docker compose up -d:

1. docker compose ps — all services should show "healthy"
2. Send /ping to your bot in Telegram
3. Bot replies "pong"
4. docker compose logs -f telegram-bot shows "backyard: ready"
   and "message received"

If any service is unhealthy:

    docker compose logs postgres
    docker compose logs redis
    docker compose logs telegram-bot

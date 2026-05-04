import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "redis";
import { logger } from "./utils/logger.js";
import { migrate, query } from "./db.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = createClient({ url: REDIS_URL });
redis.on("error", (err) => logger.error({ err }, "redis error"));

let bot;

async function start() {
  logger.info("backyard: starting");

  await redis.connect();
  logger.info("backyard: redis connected");

  await migrate();

  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not set");

  bot = new TelegramBot(token, { polling: true });

  bot.on("polling_error", (err) =>
    logger.error({ err }, "telegram: polling error"),
  );

  bot.on("message", async (msg) => {
    const chatId   = msg.chat?.id;
    const userId   = msg.from?.id;
    const username = msg.from?.username ?? null;
    const text     = msg.text ?? null;

    logger.info({ chatId, userId, username, text }, "message received");

    try {
      await query(
        `INSERT INTO events (chat_id, user_id, username, type, payload)
         VALUES ($1, $2, $3, 'message', $4)`,
        [chatId, userId, username, JSON.stringify({ text })],
      );
    } catch (err) {
      logger.error({ err }, "db: failed to insert event");
    }

    if (text === "/ping") {
      await bot.sendMessage(chatId, "pong");
    }
  });

  logger.info("backyard: ready");
}

start().catch((err) => {
  logger.error({ err }, "backyard: startup failed");
  process.exit(1);
});

process.on("SIGTERM", async () => {
  logger.info("backyard: shutting down");
  if (bot) await bot.stopPolling();
  if (redis.isOpen) await redis.quit().catch(() => {});
  process.exit(0);
});

process.on("SIGINT", () => process.emit("SIGTERM"));

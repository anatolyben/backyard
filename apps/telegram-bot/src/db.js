import pg from "pg";
import { logger } from "./utils/logger.js";

const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.PGHOST     || "localhost",
  port:     Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "backyard",
  user:     process.env.PGUSER     || "postgres",
  password: process.env.PGPASSWORD,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id          BIGSERIAL   PRIMARY KEY,
      chat_id     BIGINT      NOT NULL,
      user_id     BIGINT      NOT NULL,
      username    TEXT,
      type        TEXT        NOT NULL DEFAULT 'message',
      payload     JSONB       NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS events_chat_id_idx
      ON events (chat_id);
    CREATE INDEX IF NOT EXISTS events_user_id_idx
      ON events (user_id);
    CREATE INDEX IF NOT EXISTS events_created_at_idx
      ON events (created_at DESC);
  `);
  logger.info("db: migrations complete");
}

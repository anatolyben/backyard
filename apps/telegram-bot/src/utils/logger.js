import pino from "pino";
import { AsyncLocalStorage } from "node:async_hooks";

const logContext = new AsyncLocalStorage();

export function runWithContext(ctx, fn) {
  return logContext.run(ctx, fn);
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: false,
  mixin() {
    const store = logContext.getStore();
    if (!store) return {};
    const out = {};
    if (store.chatId != null) out.chatId = store.chatId;
    if (store.userId != null) out.userId = store.userId;
    return out;
  },
});

// src/telegram-remote.ts
import { Plugin } from "@opencode/plugin";

// src/bot.ts
import { Bot } from "grammy";
function isUserAllowed(ctx, allowedUserIds) {
  const userId = ctx.from?.id;
  if (!userId) return false;
  return allowedUserIds.includes(userId);
}
function createTelegramBot(config, sessionTitleService) {
  console.log("[Bot] createTelegramBot called");
  const bot = new Bot(config.botToken);
  console.log("[Bot] Setting up middleware and handlers...");
  bot.use(async (ctx, next) => {
    if (!isUserAllowed(ctx, config.allowedUserIds)) {
      console.log(`[Bot] Unauthorized access attempt from user ${ctx.from?.id}`);
      return;
    }
    if (ctx.chat?.type !== "private") {
      return;
    }
    if (ctx.chat?.id) {
      const previousChatId = sessionTitleService.getActiveChatId();
      const isNewChatId = previousChatId !== ctx.chat.id;
      sessionTitleService.setActiveChatId(ctx.chat.id);
      if (isNewChatId) {
        console.log(`[Bot] New chat_id discovered: ${ctx.chat.id}`);
        await ctx.reply(
          `\u2705 Chat connected!

Your chat_id: ${ctx.chat.id}

This chat is now active for OpenCode notifications.`
        );
      }
    }
    await next();
  });
  const manager = createBotManager(bot, sessionTitleService);
  bot.catch((error) => {
    console.error("[Bot] Bot error caught:", error);
  });
  console.log("[Bot] All handlers registered, returning bot manager");
  return manager;
}
function requireActiveChatId(sessionTitleService, action) {
  const chatId = sessionTitleService.getActiveChatId();
  if (!chatId) {
    const message = `No active chat available for ${action}. Ask an allowed user to message the bot first.`;
    console.warn(message);
    throw new Error(message);
  }
  return chatId;
}
function createBotManager(bot, sessionTitleService) {
  return {
    async start() {
      console.log("[Bot] start() called - beginning long polling...");
      await bot.start({
        drop_pending_updates: true,
        onStart: async () => {
          console.log("[Bot] Telegram bot polling started successfully");
          try {
            const chatId = sessionTitleService.getActiveChatId();
            if (!chatId) {
              console.log("[Bot] No active chat yet; skipping startup message");
              return;
            }
            await bot.api.sendMessage(chatId, "Messaging enabled");
            console.log("[Bot] Startup message sent to active chat");
          } catch (error) {
            console.error("[Bot] Failed to send startup message:", error);
          }
        }
      });
    },
    async stop() {
      console.log("[Bot] stop() called");
      await bot.stop();
      console.log("[Bot] Bot stopped and instance cleared");
    },
    async sendMessage(text, options) {
      console.log(`[Bot] sendMessage: "${text.slice(0, 50)}..."`);
      const chatId = requireActiveChatId(sessionTitleService, "sendMessage");
      const result = await bot.api.sendMessage(chatId, text, options);
      return { message_id: result.message_id };
    },
    async editMessage(messageId, text) {
      console.log(`[Bot] editMessage ${messageId}: "${text.slice(0, 50)}..."`);
      const chatId = requireActiveChatId(sessionTitleService, "editMessage");
      await bot.api.editMessageText(chatId, messageId, text);
    },
    async deleteMessage(messageId) {
      console.log(`[Bot] deleteMessage ${messageId}`);
      const chatId = requireActiveChatId(sessionTitleService, "deleteMessage");
      await bot.api.deleteMessage(chatId, messageId);
    }
  };
}

// src/config.ts
import { resolve } from "path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: resolve(process.cwd(), ".env") });
function parseAllowedUserIds(value) {
  if (!value || value.trim() === "") {
    return [];
  }
  return value.split(",").map((id) => id.trim()).filter((id) => id !== "").map((id) => Number.parseInt(id, 10)).filter((id) => !Number.isNaN(id));
}
function loadConfig() {
  console.log("[Config] Loading environment configuration...");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const allowedUserIdsStr = process.env.TELEGRAM_ALLOWED_USER_IDS;
  const chatIdStr = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || botToken.trim() === "") {
    console.error("[Config] Missing TELEGRAM_BOT_TOKEN");
    throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
  }
  const allowedUserIds = parseAllowedUserIds(allowedUserIdsStr);
  if (allowedUserIds.length === 0) {
    console.error("[Config] Missing or invalid TELEGRAM_ALLOWED_USER_IDS");
    throw new Error(
      "Missing or invalid TELEGRAM_ALLOWED_USER_IDS (must be comma-separated numeric user IDs)"
    );
  }
  let chatId;
  if (chatIdStr && chatIdStr.trim() !== "") {
    const parsed = Number.parseInt(chatIdStr.trim(), 10);
    if (!Number.isNaN(parsed)) {
      chatId = parsed;
      console.log(`[Config] Chat ID configured: ${chatId}`);
    } else {
      console.warn(`[Config] Invalid TELEGRAM_CHAT_ID: ${chatIdStr}`);
    }
  }
  console.log(
    `[Config] Configuration loaded: allowedUsers=${allowedUserIds.length}`
  );
  return {
    botToken,
    allowedUserIds,
    chatId
  };
}

// src/services/session-title-service.ts
var SessionTitleService = class {
  sessionTitles = /* @__PURE__ */ new Map();
  activeChatId = null;
  setSessionTitle(sessionId, title) {
    this.sessionTitles.set(sessionId, title);
  }
  getSessionTitle(sessionId) {
    return this.sessionTitles.get(sessionId) ?? null;
  }
  setActiveChatId(chatId) {
    this.activeChatId = chatId;
  }
  getActiveChatId() {
    return this.activeChatId;
  }
  clearActiveChatId() {
    this.activeChatId = null;
  }
};

// src/v2-events.ts
async function handleEvent(event, context, getTitle) {
  if (event.type === "session.created" || event.type === "session.renamed") {
    const data2 = event.data;
    if (data2.title) context.sessionTitleService.setSessionTitle(data2.sessionID, data2.title);
    return;
  }
  if (event.type !== "session.idle" && event.type !== "form.created") return;
  const data = event.data;
  const sessionID = event.type === "form.created" ? data.form?.sessionID : data.sessionID;
  if (!sessionID) return;
  let title = context.sessionTitleService.getSessionTitle(sessionID);
  if (!title) {
    try {
      title = await getTitle(sessionID) ?? null;
      if (title) context.sessionTitleService.setSessionTitle(sessionID, title);
    } catch (error) {
      console.warn("[TelegramRemote] Could not retrieve session title:", error);
    }
  }
  let message = title ? `Agent has finished: ${title}` : "Agent has finished.";
  if (event.type === "form.created" && data.form) {
    const fields = data.form.fields.filter((field) => !field.hidden).map((field, index) => `${index + 1}. ${field.title || field.description || field.key}`).join("\n");
    message = `${title ? `\u{1F4CB} ${title}` : `Session: ${sessionID}`}

\u2753 ${data.form.title}
${fields}`;
  }
  try {
    await context.bot.sendMessage(message);
  } catch (error) {
    console.error("[TelegramRemote] Failed to send notification:", error);
  }
}

// src/telegram-remote.ts
var telegram_remote_default = Plugin.define({
  id: "telegram-remote",
  setup(ctx) {
    let config;
    try {
      config = loadConfig();
    } catch (error) {
      console.error("[TelegramRemote] Configuration error:", error);
      return;
    }
    const titles = new SessionTitleService();
    if (config.chatId) titles.setActiveChatId(config.chatId);
    const bot = createTelegramBot(config, titles);
    const controller = new AbortController();
    void bot.start().catch((error) => console.error("[TelegramRemote] Bot polling failed:", error));
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          await handleEvent(event, { bot, sessionTitleService: titles }, async (sessionID) => {
            const session = await ctx.session.get({ sessionID });
            return session.title;
          });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          console.error("[TelegramRemote] Event subscription failed:", error);
      }
    })();
    return async () => {
      controller.abort();
      await bot.stop();
    };
  }
});
export {
  telegram_remote_default as default
};

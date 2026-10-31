import { Plugin } from "@opencode/plugin";
import { createTelegramBot } from "./bot.js";
import { type Config, loadConfig } from "./config.js";
import { SessionTitleService } from "./services/session-title-service.js";
import { handleEvent } from "./v2-events.js";

export default Plugin.define({
  id: "telegram-remote",
  setup(ctx) {
    let config: Config;
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
  },
});

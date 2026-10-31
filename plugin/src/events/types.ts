import type { TelegramBotManager } from "../bot.js";
import type { SessionTitleService } from "../services/session-title-service.js";

export interface EventHandlerContext {
  bot: TelegramBotManager;
  sessionTitleService: SessionTitleService;
}

import type { V2Event } from "@opencode/client";
import type { EventHandlerContext } from "./events/types.js";

export async function handleEvent(
  event: V2Event,
  context: EventHandlerContext,
  getTitle: (sessionID: string) => Promise<string | undefined>,
): Promise<void> {
  // RPC events have arbitrary names and data; narrow the known event payloads explicitly.
  if (event.type === "session.created" || event.type === "session.renamed") {
    const data = event.data as { sessionID: string; title?: string };
    if (data.title) context.sessionTitleService.setSessionTitle(data.sessionID, data.title);
    return;
  }
  if (event.type !== "session.idle" && event.type !== "form.created") return;
  const data = event.data as {
    sessionID?: string;
    form?: {
      sessionID: string;
      title: string;
      fields: Array<{ key: string; title?: string; description?: string; hidden?: boolean }>;
    };
  };
  const sessionID = event.type === "form.created" ? data.form?.sessionID : data.sessionID;
  if (!sessionID) return;
  let title = context.sessionTitleService.getSessionTitle(sessionID);
  if (!title) {
    try {
      title = (await getTitle(sessionID)) ?? null;
      if (title) context.sessionTitleService.setSessionTitle(sessionID, title);
    } catch (error) {
      console.warn("[TelegramRemote] Could not retrieve session title:", error);
    }
  }
  let message = title ? `Agent has finished: ${title}` : "Agent has finished.";
  if (event.type === "form.created" && data.form) {
    const fields = data.form.fields
      .filter((field) => !field.hidden)
      .map((field, index) => `${index + 1}. ${field.title || field.description || field.key}`)
      .join("\n");
    message = `${title ? `📋 ${title}` : `Session: ${sessionID}`}\n\n❓ ${data.form.title}\n${fields}`;
  }
  try {
    await context.bot.sendMessage(message);
  } catch (error) {
    console.error("[TelegramRemote] Failed to send notification:", error);
  }
}

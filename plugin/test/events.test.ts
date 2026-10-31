import assert from "node:assert/strict";
import { test } from "node:test";
import type { V2Event } from "@opencode/client";
import type { EventHandlerContext } from "../src/events/types.js";
import { SessionTitleService } from "../src/services/session-title-service.js";
import { handleEvent } from "../src/v2-events.js";

const event = (type: string, data: object) => ({ type, data }) as V2Event;
test("session titles and idle notifications, including existing sessions", async () => {
  const messages: string[] = [];
  const context = {
    sessionTitleService: new SessionTitleService(),
    bot: {
      sendMessage: async (text: string) => {
        messages.push(text);
      },
    },
  } as unknown as EventHandlerContext;
  await handleEvent(
    event("session.created", { sessionID: "a", title: "First" }),
    context,
    async () => undefined,
  );
  await handleEvent(
    event("session.renamed", { sessionID: "a", title: "Renamed" }),
    context,
    async () => undefined,
  );
  await handleEvent(event("session.idle", { sessionID: "a" }), context, async () => {
    throw Error("cached title expected");
  });
  await handleEvent(event("session.idle", { sessionID: "b" }), context, async () => "Existing");
  assert.deepEqual(messages, ["Agent has finished: Renamed", "Agent has finished: Existing"]);
});
test("form notifications omit hidden fields and delivery failures do not stop the event stream", async () => {
  const messages: string[] = [];
  const context = {
    sessionTitleService: new SessionTitleService(),
    bot: {
      sendMessage: async (text: string) => {
        messages.push(text);
      },
    },
  } as unknown as EventHandlerContext;
  await handleEvent(
    event("form.created", {
      form: {
        sessionID: "a",
        title: "Questions",
        fields: [
          { key: "q", title: "Proceed?" },
          { key: "secret", hidden: true },
        ],
      },
    }),
    context,
    async () => "Work",
  );
  assert.match(messages[0], /Work[\s\S]*Questions[\s\S]*Proceed\?/);
  assert.doesNotMatch(messages[0], /secret/);
  context.bot.sendMessage = async () => {
    throw Error("offline");
  };
  await handleEvent(event("session.idle", { sessionID: "a" }), context, async () => undefined);
});

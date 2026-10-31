import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/telegram-remote.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["@opencode/plugin", "grammy", "dotenv"],
});

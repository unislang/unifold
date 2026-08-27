import { createUnifoldPlaywrightConfig } from "@unislang/unifold-playwright";
import type { PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const port = Number(process.env["PLAYWRIGHT_STUDIO_PORT"] ?? "4184");
const config: PlaywrightTestConfig = createUnifoldPlaywrightConfig({
  baseURL: `http://127.0.0.1:${port}`,
  testDir: "."
});
config.testMatch = "**/*.spec.ts";
config.globalSetup = fileURLToPath(new URL("./preview-lifecycle.mjs", import.meta.url));

export default config;

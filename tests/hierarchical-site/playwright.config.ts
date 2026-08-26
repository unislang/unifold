import { createUnifoldPlaywrightConfig } from "@unislang/unifold-playwright";
import type { PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const port = 4_183;
const config: PlaywrightTestConfig = createUnifoldPlaywrightConfig({
  baseURL: `http://127.0.0.1:${port}`,
  testDir: "."
});
config.testMatch = "**/*.spec.ts";
config.globalSetup = fileURLToPath(new URL("./preview-lifecycle.mjs", import.meta.url));

export default config;

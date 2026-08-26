import { createUnifoldPlaywrightConfig } from "@unislang/unifold-playwright";
import type { PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const externalBaseUrl = process.env["PLAYWRIGHT_BASE_URL"];
const port = 4_183;
const config: PlaywrightTestConfig = createUnifoldPlaywrightConfig({
  baseURL: externalBaseUrl ?? `http://127.0.0.1:${port}`,
  testDir: "."
});
config.testMatch = "**/*.spec.ts";
if (externalBaseUrl === undefined) {
  config.globalSetup = fileURLToPath(new URL("./preview-lifecycle.mjs", import.meta.url));
}

export default config;

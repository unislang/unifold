import { createUnifoldPlaywrightConfig } from "@unislang/unifold-playwright";
import type { PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const baseURL = "http://127.0.0.1:4174";

const config: PlaywrightTestConfig = {
  ...createUnifoldPlaywrightConfig({ baseURL, testDir: "." }),
  globalSetup: fileURLToPath(new URL("./scripts/preview-lifecycle.test-data.mjs", import.meta.url))
};

export default config;

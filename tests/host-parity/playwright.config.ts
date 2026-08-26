import type { PlaywrightTestConfig } from "@playwright/test";
import { createUnifoldPlaywrightConfig } from "@unislang/unifold-playwright";
import { fileURLToPath } from "node:url";

const externalBaseUrl = process.env["PLAYWRIGHT_HOST_PARITY_BASE_URL"];
const port = parityPort(process.env["PLAYWRIGHT_HOST_PARITY_PORT"]);
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${port}`;
const config: PlaywrightTestConfig = createUnifoldPlaywrightConfig({ baseURL, testDir: "." });
config.testMatch = "**/*.spec.ts";
if (externalBaseUrl === undefined) {
  config.globalSetup = fileURLToPath(new URL("./scripts/preview-lifecycle.mjs", import.meta.url));
}

export default config;

function parityPort(input: string | undefined): number {
  const candidate = Number(input ?? "4177");
  if (!isValidPort(candidate))
    throw new Error("PLAYWRIGHT_HOST_PARITY_PORT must be a valid TCP port.");
  return candidate;
}

function isValidPort(candidate: number): boolean {
  if (!Number.isInteger(candidate)) return false;
  return candidate >= 1 && candidate <= 65_535;
}

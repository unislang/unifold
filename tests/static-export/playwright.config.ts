import { createUnifoldPlaywrightConfig } from "@unislang/unifold-playwright";
import type { PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const externalBaseUrl = process.env["PLAYWRIGHT_STATIC_EXPORT_BASE_URL"];
const port = fixturePort(process.env["PLAYWRIGHT_STATIC_EXPORT_PORT"]);
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${port}`;
const shared = createUnifoldPlaywrightConfig({
  baseURL,
  testDir: "."
});

const config: PlaywrightTestConfig = {
  ...shared,
  testMatch: "**/*.spec.ts"
};
if (externalBaseUrl === undefined) {
  config.globalSetup = fileURLToPath(new URL("./scripts/preview-lifecycle.mjs", import.meta.url));
}

export default config;

function fixturePort(input: string | undefined): number {
  const port = Number(input ?? "4175");
  if (!isValidPort(port)) {
    throw new Error("PLAYWRIGHT_STATIC_EXPORT_PORT must be a valid TCP port.");
  }
  return port;
}

function isValidPort(port: number): boolean {
  if (!Number.isInteger(port)) return false;
  return port >= 1 && port <= 65_535;
}

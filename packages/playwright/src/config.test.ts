import { expect, it, vi } from "vitest";

import { createUnifoldPlaywrightConfig } from "./config.js";

it("creates a local three-browser configuration", verifyLocalConfig);
it("enables CI retry and artifact settings", verifyCiConfig);
it("includes an optional managed web server", verifyWebServerConfig);

function verifyLocalConfig(): void {
  vi.stubEnv("CI", "");
  const config = createUnifoldPlaywrightConfig({ baseURL: "http://localhost", testDir: "tests" });
  expect(config).toMatchObject({
    forbidOnly: false,
    fullyParallel: true,
    reporter: "list",
    retries: 0,
    use: { baseURL: "http://localhost" }
  });
  expect(config.projects?.map((project) => project.name)).toEqual([
    "chromium",
    "firefox",
    "webkit"
  ]);
}

function verifyCiConfig(): void {
  vi.stubEnv("CI", "true");
  const config = createUnifoldPlaywrightConfig({ baseURL: "http://localhost", testDir: "tests" });
  expect(config).toMatchObject({ forbidOnly: true, reporter: "blob", retries: 1 });
  expect(config.use).toMatchObject({
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure"
  });
}

function verifyWebServerConfig(): void {
  const webServer = { command: "preview", port: 4173 };
  const config = createUnifoldPlaywrightConfig({
    baseURL: "http://localhost:4173",
    testDir: "tests",
    webServer
  });
  expect(config.webServer).toEqual(webServer);
}

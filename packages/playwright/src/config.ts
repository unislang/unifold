import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

export interface UnifoldPlaywrightOptions {
  readonly baseURL: string;
  readonly testDir: string;
  readonly webServer?: PlaywrightTestConfig["webServer"];
}

export function createUnifoldPlaywrightConfig(
  options: UnifoldPlaywrightOptions
): PlaywrightTestConfig {
  const config: PlaywrightTestConfig = {
    testDir: options.testDir,
    fullyParallel: true,
    forbidOnly: isCi(),
    retries: retryCount(),
    reporter: reporterName(),
    use: {
      baseURL: options.baseURL,
      screenshot: "only-on-failure",
      trace: "on-first-retry",
      video: "retain-on-failure"
    },
    projects: browserProjects()
  };
  if (options.webServer) return defineConfig({ ...config, webServer: options.webServer });
  return defineConfig(config);
}

function isCi(): boolean {
  return Boolean(process.env["CI"]);
}

function retryCount(): number {
  return isCi() ? 1 : 0;
}

function reporterName(): "blob" | "list" {
  return isCi() ? "blob" : "list";
}

function browserProjects(): NonNullable<PlaywrightTestConfig["projects"]> {
  return [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ];
}

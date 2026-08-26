import { defineConfig } from "@playwright/test";

const port = Number(process.env["CONSUMER_PORT"] ?? "43173");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  fullyParallel: false,
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: "line",
  retries: 0,
  testDir: ".",
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL
  },
  workers: 1
});

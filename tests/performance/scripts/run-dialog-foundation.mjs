import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const outputDirectory = resolve(workspaceRoot, "benchmark-results");
const outputPath = resolve(outputDirectory, "dialog-foundation.json");
const vitest = resolve(workspaceRoot, "node_modules/vitest/vitest.mjs");

await mkdir(outputDirectory, { recursive: true });
execFileSync(
  process.execPath,
  [vitest, "run", "dialog-foundation-profile.test.ts", "--config", "vitest.config.ts"],
  {
    cwd: packageRoot,
    env: { ...process.env, UNIFOLD_DIALOG_FOUNDATION_OUTPUT: outputPath },
    stdio: "inherit"
  }
);
process.stdout.write(`Dialog foundation report: ${outputPath}\n`);

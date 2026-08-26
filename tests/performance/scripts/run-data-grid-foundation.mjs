import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const output = resolve(workspaceRoot, "benchmark-results/data-grid-foundation.json");
const executable = resolve(workspaceRoot, "node_modules/vitest/vitest.mjs");

await mkdir(dirname(output), { recursive: true });
execFileSync(
  process.execPath,
  [
    executable,
    "run",
    "data-grid-foundation-profile.test.ts",
    "--config",
    "performance-profile.vitest.config.ts"
  ],
  {
    cwd: packageRoot,
    env: { ...process.env, UNIFOLD_DATA_GRID_FOUNDATION_OUTPUT: output },
    stdio: "inherit"
  }
);
process.stdout.write(`DataGrid foundation report: ${output}\n`);

import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config.js";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      pool: "forks",
      poolOptions: {
        forks: { execArgv: ["--expose-gc"], singleFork: true }
      },
      testTimeout: 120_000
    }
  })
);

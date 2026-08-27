import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    manifest: true,
    terserOptions: { compress: { passes: 3 }, module: true, toplevel: true }
  },
  resolve: {
    alias: {
      "@unislang/unifold-theme/tokens.css": source("theme", "tokens.css"),
      "@unislang/unifold-contracts/schemas/derived-rule.schema.json": contractSchema(
        "derived-rule.schema.json"
      ),
      "@unislang/unifold-contracts/schemas/semantic-graph.schema.json": contractSchema(
        "semantic-graph.schema.json"
      ),
      "@unislang/unifold-ai/evaluation": source("ai", "evaluation.ts"),
      "@unislang/unifold-ai": source("ai"),
      "@unislang/unifold-contracts": source("contracts"),
      "@unislang/unifold-elements": source("elements"),
      "@unislang/unifold-events": source("events"),
      "@unislang/unifold-export": source("export"),
      "@unislang/unifold-modules": source("modules"),
      "@unislang/unifold-studio": source("studio"),
      "@unislang/unifold": source("unifold")
    }
  },
  test: {
    include: ["examples/studio/src/**/*.test.ts"],
    restoreMocks: true
  }
});

function source(packageName: string, fileName = "index.ts"): string {
  return fileURLToPath(new URL(`../../packages/${packageName}/src/${fileName}`, import.meta.url));
}

function contractSchema(fileName: string): string {
  return fileURLToPath(new URL(`../../packages/contracts/schemas/${fileName}`, import.meta.url));
}

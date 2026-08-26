import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

function source(packageName: string): string {
  return fileURLToPath(new URL(`../../packages/${packageName}/src/index.ts`, import.meta.url));
}

function schema(name: string): string {
  return fileURLToPath(new URL(`../../packages/contracts/schemas/${name}`, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: {
      "@unislang/unifold-contracts/schemas/derived-rule.schema.json": schema(
        "derived-rule.schema.json"
      ),
      "@unislang/unifold-contracts/schemas/semantic-graph.schema.json": schema(
        "semantic-graph.schema.json"
      ),
      "@unislang/unifold": source("unifold"),
      "@unislang/unifold-catalog": source("catalog"),
      "@unislang/unifold-collaboration": source("collaboration"),
      "@unislang/unifold-compositions": source("compositions"),
      "@unislang/unifold-contracts": source("contracts"),
      "@unislang/unifold-data": source("data"),
      "@unislang/unifold-devtools": source("devtools"),
      "@unislang/unifold-elements": source("elements"),
      "@unislang/unifold-events": source("events"),
      "@unislang/unifold-forms": source("forms"),
      "@unislang/unifold-ir": source("ir"),
      "@unislang/unifold-jsonui": source("jsonui"),
      "@unislang/unifold-reactivity": source("reactivity"),
      "@unislang/unifold-renderer-dom": source("renderer-dom"),
      "@unislang/unifold-rules": source("rules"),
      "@unislang/unifold-runtime": source("runtime"),
      "@unislang/unifold-semantics": source("semantics"),
      "@unislang/unifold-xstate": source("xstate")
    }
  },
  test: {
    benchmark: {
      include: ["**/*.bench.ts"]
    },
    include: ["**/*.test.ts"]
  }
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

function packageSource(packageName: string): string {
  return fileURLToPath(new URL(`./packages/${packageName}/src/index.ts`, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: {
      "@unislang/unifold-contracts/schemas/semantic-graph.schema.json": fileURLToPath(
        new URL("./packages/contracts/schemas/semantic-graph.schema.json", import.meta.url)
      ),
      "@unislang/unifold-contracts/schemas/derived-rule.schema.json": fileURLToPath(
        new URL("./packages/contracts/schemas/derived-rule.schema.json", import.meta.url)
      ),
      "@unislang/unifold-ai": packageSource("ai"),
      "@unislang/unifold-catalog": packageSource("catalog"),
      "@unislang/unifold-compositions": packageSource("compositions"),
      "@unislang/unifold-control-plane": packageSource("control-plane"),
      "@unislang/unifold-contracts": packageSource("contracts"),
      "@unislang/unifold-devtools": packageSource("devtools"),
      "@unislang/unifold-elements": packageSource("elements"),
      "@unislang/unifold-events": packageSource("events"),
      "@unislang/unifold-export": packageSource("export"),
      "@unislang/unifold-forms": packageSource("forms"),
      "@unislang/unifold-ir": packageSource("ir"),
      "@unislang/unifold-jsonui": packageSource("jsonui"),
      "@unislang/unifold-playwright": packageSource("playwright"),
      "@unislang/unifold-reactivity": packageSource("reactivity"),
      "@unislang/unifold-renderer-dom": packageSource("renderer-dom"),
      "@unislang/unifold-runtime": packageSource("runtime"),
      "@unislang/unifold-rules": packageSource("rules"),
      "@unislang/unifold-semantics": packageSource("semantics"),
      "@unislang/unifold-testkit": packageSource("testkit"),
      "@unislang/unifold-theme": packageSource("theme"),
      "@unislang/unifold": packageSource("unifold"),
      "@unislang/unifold-xstate": packageSource("xstate")
    }
  },
  test: {
    coverage: {
      enabled: false,
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "**/*types.ts",
        "packages/contracts/src/json.ts",
        "packages/contracts/src/ui-document.ts"
      ],
      include: ["packages/*/src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    include: [
      "packages/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.ts",
      "examples/**/src/**/*.test.ts"
    ],
    passWithNoTests: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true
  }
});

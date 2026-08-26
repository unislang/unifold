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
      "@unislang/unifold-elements/audit-log": fileURLToPath(
        new URL("../../packages/elements/src/audit-log-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/breadcrumb": fileURLToPath(
        new URL("../../packages/elements/src/breadcrumb-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/combobox": fileURLToPath(
        new URL("../../packages/elements/src/combobox-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/data-grid": fileURLToPath(
        new URL("../../packages/elements/src/data-grid-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/dialog": fileURLToPath(
        new URL("../../packages/elements/src/dialog-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/file-input": fileURLToPath(
        new URL("../../packages/elements/src/file-input-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/form-structure": fileURLToPath(
        new URL("../../packages/elements/src/form-structure-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/content-media": fileURLToPath(
        new URL("../../packages/elements/src/content-media-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/number-field": fileURLToPath(
        new URL("../../packages/elements/src/number-field-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/search-results": fileURLToPath(
        new URL("../../packages/elements/src/search-results-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/stepper": fileURLToPath(
        new URL("../../packages/elements/src/stepper-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/menu-button": fileURLToPath(
        new URL("../../packages/elements/src/menu-button-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/popover": fileURLToPath(
        new URL("../../packages/elements/src/popover-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/master-detail": fileURLToPath(
        new URL("../../packages/elements/src/master-detail-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/tabs": fileURLToPath(
        new URL("../../packages/elements/src/tabs-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/wizard": fileURLToPath(
        new URL("../../packages/elements/src/wizard-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/virtual-list": fileURLToPath(
        new URL("../../packages/elements/src/virtual-list-entry.ts", import.meta.url)
      ),
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

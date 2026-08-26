import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

function packageSource(packageName: string): string {
  return fileURLToPath(new URL(`./packages/${packageName}/src/index.ts`, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: {
      "@unislang/unifold-theme/tokens.css": fileURLToPath(
        new URL("./packages/theme/src/tokens.css", import.meta.url)
      ),
      "@unislang/unifold-contracts/schemas/semantic-graph.schema.json": fileURLToPath(
        new URL("./packages/contracts/schemas/semantic-graph.schema.json", import.meta.url)
      ),
      "@unislang/unifold-contracts/schemas/derived-rule.schema.json": fileURLToPath(
        new URL("./packages/contracts/schemas/derived-rule.schema.json", import.meta.url)
      ),
      "@unislang/unifold-elements/tooltip": fileURLToPath(
        new URL("./packages/elements/src/tooltip-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/popover": fileURLToPath(
        new URL("./packages/elements/src/popover-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/breadcrumb": fileURLToPath(
        new URL("./packages/elements/src/breadcrumb-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/dialog": fileURLToPath(
        new URL("./packages/elements/src/dialog-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/file-input": fileURLToPath(
        new URL("./packages/elements/src/file-input-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/form-structure": fileURLToPath(
        new URL("./packages/elements/src/form-structure-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/content-media": fileURLToPath(
        new URL("./packages/elements/src/content-media-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/audit-log": fileURLToPath(
        new URL("./packages/elements/src/audit-log-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/combobox": fileURLToPath(
        new URL("./packages/elements/src/combobox-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/data-grid": fileURLToPath(
        new URL("./packages/elements/src/data-grid-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/search-results": fileURLToPath(
        new URL("./packages/elements/src/search-results-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/stepper": fileURLToPath(
        new URL("./packages/elements/src/stepper-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/menu-button": fileURLToPath(
        new URL("./packages/elements/src/menu-button-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/master-detail": fileURLToPath(
        new URL("./packages/elements/src/master-detail-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/tabs": fileURLToPath(
        new URL("./packages/elements/src/tabs-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/wizard": fileURLToPath(
        new URL("./packages/elements/src/wizard-entry.ts", import.meta.url)
      ),
      "@unislang/unifold-elements/virtual-list": fileURLToPath(
        new URL("./packages/elements/src/virtual-list-entry.ts", import.meta.url)
      ),
      "@unislang/unifold/audit-log": fileURLToPath(
        new URL("./packages/unifold/src/audit-log.ts", import.meta.url)
      ),
      "@unislang/unifold/combobox": fileURLToPath(
        new URL("./packages/unifold/src/combobox.ts", import.meta.url)
      ),
      "@unislang/unifold/data-grid": fileURLToPath(
        new URL("./packages/unifold/src/data-grid.ts", import.meta.url)
      ),
      "@unislang/unifold/search-results": fileURLToPath(
        new URL("./packages/unifold/src/search-results.ts", import.meta.url)
      ),
      "@unislang/unifold/stepper": fileURLToPath(
        new URL("./packages/unifold/src/stepper.ts", import.meta.url)
      ),
      "@unislang/unifold/menu-button": fileURLToPath(
        new URL("./packages/unifold/src/menu-button.ts", import.meta.url)
      ),
      "@unislang/unifold/master-detail": fileURLToPath(
        new URL("./packages/unifold/src/master-detail.ts", import.meta.url)
      ),
      "@unislang/unifold/tabs": fileURLToPath(
        new URL("./packages/unifold/src/tabs.ts", import.meta.url)
      ),
      "@unislang/unifold/wizard": fileURLToPath(
        new URL("./packages/unifold/src/wizard.ts", import.meta.url)
      ),
      "@unislang/unifold/virtual-list": fileURLToPath(
        new URL("./packages/unifold/src/virtual-list.ts", import.meta.url)
      ),
      "@unislang/unifold/tooltip": fileURLToPath(
        new URL("./packages/unifold/src/tooltip.ts", import.meta.url)
      ),
      "@unislang/unifold/popover": fileURLToPath(
        new URL("./packages/unifold/src/popover.ts", import.meta.url)
      ),
      "@unislang/unifold/breadcrumb": fileURLToPath(
        new URL("./packages/unifold/src/breadcrumb.ts", import.meta.url)
      ),
      "@unislang/unifold/dialog": fileURLToPath(
        new URL("./packages/unifold/src/dialog.ts", import.meta.url)
      ),
      "@unislang/unifold/file-input": fileURLToPath(
        new URL("./packages/unifold/src/file-input.ts", import.meta.url)
      ),
      "@unislang/unifold/form-structure": fileURLToPath(
        new URL("./packages/unifold/src/form-structure.ts", import.meta.url)
      ),
      "@unislang/unifold/content-media": fileURLToPath(
        new URL("./packages/unifold/src/content-media.ts", import.meta.url)
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

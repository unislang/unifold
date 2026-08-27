import { resolve } from "node:path";

export const COLOCATION_SOURCE_EXEMPTIONS = Object.freeze([
  Object.freeze({
    path: "apps/reference/src/main.ts",
    reason: "Browser bootstrap behavior is exercised through the production Playwright journeys."
  }),
  Object.freeze({
    path: "apps/reference/src/main.types.ts",
    reason: "The module contains erased TypeScript declarations and no runtime behavior."
  }),
  Object.freeze({
    path: "apps/reference/src/store-fixture.ts",
    reason: "The module is browser test data exercised by the store Playwright journeys."
  }),
  Object.freeze({
    path: "examples/test-scenario/src/contact-form.scenario.ts",
    reason: "The module is a portable data-only test scenario, not an implementation boundary."
  })
]);

export function colocationExemptionPaths(workspaceRoot) {
  return COLOCATION_SOURCE_EXEMPTIONS.map(({ path }) => resolve(workspaceRoot, path));
}

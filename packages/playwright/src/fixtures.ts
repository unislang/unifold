import { test as base } from "@playwright/test";
import { installEventCapture } from "./browser-capture.js";
import { UnifoldHarness } from "./harness.js";

export interface UnifoldFixtures {
  readonly unifold: UnifoldHarness;
}

export const test = base.extend<UnifoldFixtures>({
  unifold: async ({ page }, use) => {
    await installEventCapture(page);
    await use(new UnifoldHarness(page));
  }
});

export { expect } from "@playwright/test";

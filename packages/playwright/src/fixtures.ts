import { test as base } from "@playwright/test";
import { installEventCapture } from "./browser-capture.js";
import { UnifoldHarness } from "./harness.js";
import { installSettledNavigation } from "./settled-navigation.js";

export interface UnifoldFixtures {
  readonly unifold: UnifoldHarness;
}

export const test = base.extend<UnifoldFixtures>({
  unifold: [
    async ({ page }, use) => {
      await installEventCapture(page);
      installSettledNavigation(page);
      await use(new UnifoldHarness(page));
    },
    { auto: true }
  ]
});

export { expect } from "@playwright/test";

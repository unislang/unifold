// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureNativeFormLifecycle } from "./native-form-lifecycle-fixture.js";

it("keeps 100 mixed native form adapters deterministic", () => {
  const evidence = measureNativeFormLifecycle(3);
  expect(evidence.controlCount).toBe(100);
  expect(evidence.changeCount).toBe(evidence.expectedChanges);
  expect(evidence.formEntryCount).toBe(150);
  expect(evidence.expectedInputEntries).toBe(150);
});

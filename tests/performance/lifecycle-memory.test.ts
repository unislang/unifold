// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { LIFECYCLE_MEMORY_NODE_COUNT, runLifecycleCycle } from "./lifecycle-memory-fixture.js";

it("mounts, navigates, and disposes the public application lifecycle", async () => {
  const renderedNodeCount = await runLifecycleCycle(1);

  expect(renderedNodeCount).toBe(LIFECYCLE_MEMORY_NODE_COUNT);
  expect(document.body.childElementCount).toBe(0);
});

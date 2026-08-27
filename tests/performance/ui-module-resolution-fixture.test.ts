import { expect, it } from "vitest";

import { measureUiModuleResolution } from "./ui-module-resolution-fixture.js";

it("resolves a 17-module 500-node Scratch layout within the provisional gate", async () => {
  const evidence = await measureUiModuleResolution();
  expect(evidence).toMatchObject({
    gate: { passed: true },
    graphSize: 17,
    nodeCount: 500,
    sampleCount: 30
  });
});

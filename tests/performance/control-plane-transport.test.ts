import { expect, it } from "vitest";

import { measureControlPlaneTransportPerformance } from "./control-plane-transport-fixture.js";

it("round-trips exact bounded control-plane and realtime workloads over Fetch", async () => {
  const evidence = await measureControlPlaneTransportPerformance(1);
  expect(evidence.verified).toEqual({ reads: true, realtime: true });
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});

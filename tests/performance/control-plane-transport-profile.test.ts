import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureControlPlaneTransportPerformance } from "./control-plane-transport-fixture.js";

const outputPath = process.env["UNIFOLD_CONTROL_PLANE_TRANSPORT_OUTPUT"];

it.runIf(outputPath !== undefined)("writes control-plane transport performance gates", async () => {
  const evidence = await measureControlPlaneTransportPerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});

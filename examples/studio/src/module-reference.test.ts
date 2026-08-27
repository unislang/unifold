import { expect, it } from "vitest";

import controlSurface from "./control-surface.json" with { type: "json" };
import liveApplication from "./live-application.json" with { type: "json" };
import { resolveStudioModuleArtifacts } from "./module-reference.js";

it("resolves both Studio JSON surfaces as deterministic exact modules", async () => {
  const first = await resolveStudioModuleArtifacts();
  const second = await resolveStudioModuleArtifacts();

  expect(first).toEqual(second);
  expect(first.controlSurface.composedDocument).toEqual(controlSurface);
  expect(first.liveApplication.composedDocument).toEqual(liveApplication);
  expect(first.controlSurface.integrity).toMatch(/^sha256-/u);
  expect(first.liveApplication.integrity).toMatch(/^sha256-/u);
  expect(first.controlSurface.integrity).not.toBe(first.liveApplication.integrity);
  expect(first.controlSurface.graph).toEqual([
    expect.objectContaining({
      moduleId: "org.unifold.studio.control-surface",
      sourceId: "src/control-surface.json",
      version: "1.0.0"
    })
  ]);
  expect(first.liveApplication.graph).toEqual([
    expect.objectContaining({
      moduleId: "org.unifold.studio.live-application",
      sourceId: "src/live-application.json",
      version: "1.0.0"
    })
  ]);
});

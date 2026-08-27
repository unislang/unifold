import { expect, it } from "vitest";

import controlLock from "./modules/control.module.lock.json" with { type: "json" };
import controlModule from "./modules/control.module.json" with { type: "json" };
import liveLock from "./modules/live.module.lock.json" with { type: "json" };
import liveModule from "./modules/live.module.json" with { type: "json" };
import { resolveStudioModuleArtifacts } from "./module-reference.js";

it("resolves authored Studio modules through exact shared presentation imports", async () => {
  const first = await resolveStudioModuleArtifacts();
  const second = await resolveStudioModuleArtifacts();

  expect(first).toEqual(second);
  expect(first.controlSurface.integrity).toBe(controlLock.artifactIntegrity);
  expect(first.liveApplication.integrity).toBe(liveLock.artifactIntegrity);
  expect(first.controlSurface.integrity).not.toBe(first.liveApplication.integrity);
  expect(first.controlSurface.graph).toEqual(expectedGraph("control"));
  expect(first.liveApplication.graph).toEqual(expectedGraph("live"));
  expect(first.controlSurface.sourceMap["/compositions/0"]).toEqual({
    moduleId: "org.unifold.studio.presentation",
    pointer: "/exports/compositions/0",
    sourceId: "src/modules/presentation.module.json",
    version: "1.0.0"
  });
  expect(first.liveApplication.sourceMap["/compositions/0"]).toEqual(
    first.controlSurface.sourceMap["/compositions/0"]
  );
});

it("pins the same shared module integrity and namespace in both application sources", () => {
  const controlImport = controlModule.imports[0];
  const liveImport = liveModule.imports[0];
  expect(controlImport).toEqual(liveImport);
  expect(controlImport).toEqual({
    integrity: "sha256-3ZOkhKxr2Uf9_-DuF3Z31yFLzCVpv9AUfigIa_5ta5w",
    moduleId: "org.unifold.studio.presentation",
    namespace: "presentation",
    version: "1.0.0"
  });
});

function expectedGraph(application: "control" | "live") {
  return [
    expect.objectContaining({
      moduleId: "org.unifold.studio.presentation",
      namespace: "presentation",
      sourceId: "src/modules/presentation.module.json",
      version: "1.0.0"
    }),
    expect.objectContaining({
      moduleId: `org.unifold.studio.${application}`,
      namespace: "",
      sourceId: `src/modules/${application}.module.json`,
      version: "1.0.0"
    })
  ];
}

// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { HostFramework, mountHost, requireRoot } from "./host-runtime.js";

it("exposes every framework host as an enum value", () => {
  expect(Object.values(HostFramework)).toEqual(["plain", "react", "svelte", "vue"]);
});

it("mounts and disposes one framework-neutral application authority", () => {
  const container = document.createElement("div");
  container.id = "fixture-root";
  document.body.append(container);

  const dispose = mountHost(HostFramework.Plain, container);
  expect(window.__unifoldHostEvidence).toMatchObject({
    disposed: false,
    framework: HostFramework.Plain,
    mountCount: 1
  });
  expect(requireRoot("fixture-root")).toBe(container);

  dispose();
  dispose();
  expect(window.__unifoldHostEvidence?.disposed).toBe(true);
  expect(container.childElementCount).toBe(0);
  container.remove();
});

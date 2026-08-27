import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";
import { expect, it } from "vitest";

import type { UiModuleGraphNode } from "./graph.js";
import { resolveLayoutRegistry } from "./layout-resources.js";
import {
  layoutDefinitionFixture,
  layoutModuleFixture,
  moduleFixture
} from "./test-fixtures.test-data.js";
import { UiModuleDiagnosticCode, UiModuleResourceKind } from "./types.js";

it("combines qualified module layouts with a host registry snapshot", () => {
  const host = createTrustedLayoutDefinitionRegistry([
    layoutDefinitionFixture("host-page", "Host layout")
  ]);
  const result = resolveLayoutRegistry([registeredLayoutNode()], host);
  expect(result.diagnostics).toEqual([]);
  expect(result.registry?.snapshot().map((definition) => definition["layoutType"])).toEqual([
    "host-page",
    "shared/layout/profile-page"
  ]);
});

it("rejects a resource whose ID and local layout type differ", () => {
  const module = moduleFixture({
    exports: {
      compositions: [],
      documents: [],
      resources: [
        {
          id: "profile-page",
          kind: UiModuleResourceKind.Layout,
          value: layoutDefinitionFixture("other-page", "Invalid")
        }
      ]
    }
  });
  const result = resolveLayoutRegistry(
    [{ namespace: "", registered: registeredNode(module) }],
    undefined
  );
  expect(result.diagnostics[0]).toMatchObject({
    code: UiModuleDiagnosticCode.InvalidLayoutResource,
    path: "/exports/resources/0/value/layoutType",
    sourceId: "layout.module.json"
  });
});

function registeredLayoutNode(): UiModuleGraphNode {
  return { namespace: "shared", registered: registeredNode(layoutModuleFixture()) };
}

function registeredNode(module: ReturnType<typeof moduleFixture>) {
  return { integrity: "sha256-fixture", module, sourceId: "layout.module.json" };
}

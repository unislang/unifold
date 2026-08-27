import { expect, it } from "vitest";

import { resolveUiModuleGraph } from "./graph.js";
import { uiModuleKey } from "./registry.js";
import { moduleFixture } from "./test-fixtures.test-data.js";
import { UiModuleDiagnosticCode, type RegisteredUiModule } from "./types.js";

it("resolves imports in dependency order with their authored namespace", () => {
  const shared = registered(moduleFixture({ id: "org.example.shared" }), "shared-hash", "shared");
  const root = registered(
    moduleFixture({ imports: [moduleImport("org.example.shared", "shared", "shared-hash")] }),
    "root-hash",
    "root"
  );
  const graph = resolveUiModuleGraph(registry(root, shared), root);
  expect(graph.diagnostics).toEqual([]);
  expect(graph.nodes.map(({ namespace }) => namespace)).toEqual(["shared", ""]);
});

it("rejects a missing import", () => {
  const missing = registered(
    moduleFixture({ imports: [moduleImport("org.example.missing", "missing", "hash")] }),
    "root",
    "root"
  );
  expect(resolveUiModuleGraph(registry(missing), missing).diagnostics[0]?.code).toBe(
    UiModuleDiagnosticCode.ImportNotFound
  );
});

it("rejects an integrity-mismatched import", () => {
  const shared = registered(moduleFixture({ id: "org.example.shared" }), "actual", "shared");
  const mismatch = registered(
    moduleFixture({ imports: [moduleImport("org.example.shared", "shared", "expected")] }),
    "root",
    "root"
  );
  expect(resolveUiModuleGraph(registry(mismatch, shared), mismatch).diagnostics[0]?.code).toBe(
    UiModuleDiagnosticCode.ImportIntegrityMismatch
  );
});

it("rejects a cyclic import", () => {
  const cyclic = registered(
    moduleFixture({ imports: [moduleImport("org.example.root", "self", "root")] }),
    "root",
    "root"
  );
  expect(resolveUiModuleGraph(registry(cyclic), cyclic).diagnostics[0]?.code).toBe(
    UiModuleDiagnosticCode.Cycle
  );
});

function registered(
  module: ReturnType<typeof moduleFixture>,
  integrity: string,
  sourceId: string
): RegisteredUiModule {
  return { integrity, module, sourceId };
}

function registry(...modules: readonly RegisteredUiModule[]) {
  return {
    modules: new Map(
      modules.map((item) => [uiModuleKey(item.module.id, item.module.version), item])
    )
  };
}

function moduleImport(moduleId: string, namespace: string, integrity: string) {
  return { integrity, moduleId, namespace, version: "1.0.0" };
}

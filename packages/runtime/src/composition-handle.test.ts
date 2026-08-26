import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  type UiCompositionInstanceManifest
} from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiEventType,
  type UiEvent,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { UnifoldRuntime } from "./index.js";
import { compositionNode, controlNode } from "./runtime.test-data.js";

it("exposes typed exports over the same indexed event fabric", verifyCompositionHandle);
it("rejects private or incorrectly typed exports", verifyPrivateBoundary);

function verifyCompositionHandle(): void {
  const runtime = createRuntime();
  const handle = runtime.composition("editor");
  const rootEvents: UiEvent[] = [];
  const scopedEvents: UiEvent[] = [];
  const exportedEvents: UiEvent[] = [];
  runtime.events$.subscribe((event) => rootEvents.push(event));
  handle.events$.subscribe((event) => scopedEvents.push(event));
  handle.exportedEvents("changed").subscribe((event) => exportedEvents.push(event));
  const selected = handle.selection("name");
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "editor::name", value: "Ada" }]);
  expect(selected.get()).toBe("Ada");
  expect(scopedEvents.every((event, index) => event === rootEvents[index])).toBe(true);
  expect(exportedEvents).toHaveLength(1);
  expect(exportedEvents[0]).toBe(rootEvents[0]);
  expect(handle.command("setName")).toEqual({
    commandType: UiCommandType.ControlSetValue,
    nodeId: "editor::name"
  });
  verifyManifestRefresh(runtime, handle);
}

function verifyManifestRefresh(
  runtime: UnifoldRuntime,
  handle: ReturnType<UnifoldRuntime["composition"]>
): void {
  const nextManifest = compositionManifest("2.0.0", UiCompositionSelectionKind.Properties);
  runtime.execute([
    {
      compositionInstances: { editor: nextManifest },
      nodes: [
        versioned(compositionNode("editor"), "2.0.0"),
        versioned(controlNode("editor::name", "", "editor"), "2.0.0")
      ],
      type: UiCommandType.StructureReconcile
    }
  ]);
  expect(handle.definitionVersion).toBe("2.0.0");
  expect(handle.selectionKind("name")).toBe(UiCompositionSelectionKind.Properties);
}

function verifyPrivateBoundary(): void {
  const handle = createRuntime().composition("editor");
  expect(() => handle.selection("private")).toThrow("Unknown composition export");
  expect(() => handle.command("name")).toThrow("is not command");
  expect(() => handle.exportedEvents("setName")).toThrow("is not event");
  expect(() => createRuntime().composition("missing")).toThrow("Unknown composition instance");
}

function createRuntime(): UnifoldRuntime {
  return new UnifoldRuntime({
    compositionInstances: { editor: compositionManifest() },
    documentId: "composition-test",
    initialNodes: [compositionNode("editor"), controlNode("editor::name", "", "editor")]
  });
}

function compositionManifest(
  definitionVersion = "1.0.0",
  selection = UiCompositionSelectionKind.ControlValue
): UiCompositionInstanceManifest {
  return {
    ancestry: ["editor"],
    definitionName: "ProfileEditor",
    definitionSourcePointer: "/compositions/0",
    definitionVersion,
    exports: compositionExports(selection),
    instanceId: "editor",
    instanceSourcePointer: "/view",
    rootNodeId: "editor"
  };
}

function compositionExports(
  selection: UiCompositionSelectionKind
): UiCompositionInstanceManifest["exports"] {
  return {
    changed: {
      eventType: UiEventType.CommandApplied,
      kind: UiCompositionExportKind.Event,
      localId: "name",
      nodeId: "editor::name"
    },
    name: {
      kind: UiCompositionExportKind.Selection,
      localId: "name",
      nodeId: "editor::name",
      selection
    },
    setName: {
      commandType: UiCommandType.ControlSetValue,
      kind: UiCompositionExportKind.Command,
      localId: "name",
      nodeId: "editor::name"
    }
  };
}

function versioned(node: UiNodeSnapshot, version: string): UiNodeSnapshot {
  return { ...node, definitionVersion: version };
}

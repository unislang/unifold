// @vitest-environment happy-dom
import {
  UiCommandType,
  type ControlCollectionInsertCommand,
  type ControlCollectionMoveCommand,
  type ControlCollectionRemoveCommand,
  type StructureInstantiateCommand,
  type StructureReconcileCommand,
  type StructureRemoveCommand
} from "@unislang/unifold-events";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { expect, expectTypeOf, it } from "vitest";

import { createApplicationRuntime } from "./application-runtime.js";
import {
  authoredDocument,
  requireApplication,
  requirePrepared,
  runtimeFor
} from "./application.test-data.js";
import { mountUnifoldApplication } from "./mount.js";
import type { UnifoldApplicationCommand, UnifoldApplicationRuntimePort } from "./types.js";

type StructuralCommand =
  | ControlCollectionInsertCommand
  | ControlCollectionMoveCommand
  | ControlCollectionRemoveCommand
  | StructureInstantiateCommand
  | StructureReconcileCommand
  | StructureRemoveCommand;

it("admits ordinary mounted commands through the application runtime facade", () => {
  const engine = runtime();
  const facade = createApplicationRuntime(engine);
  facade.execute([{ id: "name", type: UiCommandType.ControlSetValue, value: "Updated" }]);
  expect(facade.getSnapshot("name").control?.value).toBe("Updated");
  expect(facade.revision).toBe(1);
  engine.dispose();
});

it("rejects every structural command without exposing mutable runtime capabilities", () => {
  const engine = runtime();
  const facade = createApplicationRuntime(engine);
  structuralCommands(engine).forEach((command) =>
    expect(() => facade.execute([command as never])).toThrow("not admitted")
  );
  expect(engine.getSnapshot("name")).toBeDefined();
  expect(facade.revision).toBe(0);
  expect(facade).not.toHaveProperty("dispose");
  expect(facade).not.toHaveProperty("replaceRules");
  expect(facade).not.toHaveProperty("replaceStoreBindings");
  expect(facade).not.toHaveProperty("ingestIntent");
  expect(facade).not.toHaveProperty("engine");
  expect(Reflect.get(facade, "engine")).toBeUndefined();
  expect(Reflect.ownKeys(facade)).not.toContain("engine");
  expect(Object.isFrozen(facade)).toBe(true);
  engine.dispose();
});

it("rejects mixed and erased structural commands atomically and remains usable", () => {
  const engine = runtime();
  const facade = createApplicationRuntime(engine);
  const events: unknown[] = [];
  facade.events$.subscribe((event) => events.push(event));
  const commands = [
    { id: "name", type: UiCommandType.ControlSetValue, value: "Denied" },
    { id: "name", type: UiCommandType.StructureRemove }
  ] as unknown as Parameters<typeof facade.execute>[0];
  expect(() => facade.execute(commands)).toThrow("not admitted");
  expect(facade.revision).toBe(0);
  expect(facade.getSnapshot("name").control?.value).toBe("");
  expect(events).toEqual([]);
  facade.execute([{ id: "name", type: UiCommandType.ControlSetValue, value: "Allowed" }]);
  expect(facade.getSnapshot("name").control?.value).toBe("Allowed");
  engine.dispose();
});

it("normalizes untrusted command batches before admission", () => {
  const engine = runtime();
  const facade = createApplicationRuntime(engine);
  let reads = 0;
  const changing = { id: "name", value: "Normalized" } as Record<string, unknown>;
  Object.defineProperty(changing, "type", {
    enumerable: true,
    get: () => (++reads === 1 ? UiCommandType.ControlSetValue : UiCommandType.StructureRemove)
  });
  expect(() => facade.execute([changing] as never)).not.toThrow();
  expect(reads).toBeGreaterThan(0);
  expect(engine.getSnapshot("name")).toBeDefined();
  const unstable = new Proxy(
    { id: "name", type: UiCommandType.ControlSetValue, value: "Denied" },
    { get: (target, key, receiver) => Reflect.get(target, key, receiver) }
  );
  expect(() => facade.execute([unstable] as never)).toThrow();
  expect(engine.revision).toBe(1);
  expect(engine.getSnapshot("name")).toBeDefined();
  engine.dispose();
});

it("mounts only the restricted runtime capability", () => {
  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), document.createElement("main"))
  );
  const revision = application.runtime.revision;
  const field = application.renderer.getElement("name");
  expect(() =>
    Reflect.apply(Reflect.get(application.runtime, "execute"), application.runtime, [
      [{ id: "name", type: "structure.remove" }]
    ])
  ).toThrow("not admitted");
  expect(application.runtime.revision).toBe(revision);
  expect(application.renderer.getElement("name")).toBe(field);
  expect(application.document.nodesById["name"]).toBeDefined();
  application.dispose();
});

it("excludes structural commands from the mounted command type", () => {
  type MountedCommand = Parameters<UnifoldApplicationRuntimePort["execute"]>[0][number];
  type LeakedStructuralCommand = Extract<MountedCommand, StructuralCommand>;
  type HeadlessCommand = Parameters<UnifoldRuntime["execute"]>[0][number];
  expectTypeOf<LeakedStructuralCommand>().toEqualTypeOf<never>();
  expectTypeOf<Extract<HeadlessCommand, StructuralCommand>>().toEqualTypeOf<StructuralCommand>();
  expectTypeOf<MountedCommand>().toEqualTypeOf<UnifoldApplicationCommand>();
});

function runtime(): UnifoldRuntime {
  return runtimeFor(requirePrepared(authoredDocument()));
}

function structuralCommands(engine: UnifoldRuntime): readonly object[] {
  const node = engine.getSnapshot("name");
  return [
    {
      index: 0,
      key: "created",
      node,
      parentId: "form",
      type: UiCommandType.ControlCollectionInsert
    },
    { index: 0, key: "name", parentId: "form", type: UiCommandType.ControlCollectionMove },
    { key: "name", parentId: "form", type: UiCommandType.ControlCollectionRemove },
    { node, type: UiCommandType.StructureInstantiate },
    { compositionInstances: {}, nodes: [node], type: UiCommandType.StructureReconcile },
    { id: "field", type: UiCommandType.StructureRemove }
  ];
}

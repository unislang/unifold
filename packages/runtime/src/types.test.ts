import type {
  ControlCollectionInsertCommand,
  ControlCollectionMoveCommand,
  ControlCollectionRemoveCommand,
  StructureInstantiateCommand,
  StructureReconcileCommand,
  StructureRemoveCommand
} from "@unislang/unifold-events";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { UnifoldRuntime } from "./runtime.js";
import * as subject from "./types.js";

type StructuralCommand =
  | ControlCollectionInsertCommand
  | ControlCollectionMoveCommand
  | ControlCollectionRemoveCommand
  | StructureInstantiateCommand
  | StructureReconcileCommand
  | StructureRemoveCommand;

describe("types module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("retains structural primitives on the explicit headless runtime", () => {
    type HeadlessCommand = Parameters<UnifoldRuntime["execute"]>[0][number];
    expectTypeOf<Extract<HeadlessCommand, StructuralCommand>>().toEqualTypeOf<StructuralCommand>();
  });
});

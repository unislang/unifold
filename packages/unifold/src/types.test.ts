import type {
  ControlCollectionInsertCommand,
  ControlCollectionMoveCommand,
  ControlCollectionRemoveCommand,
  ControlSetValueCommand,
  StructureInstantiateCommand,
  StructureReconcileCommand,
  StructureRemoveCommand
} from "@unislang/unifold-events";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { UnifoldApplicationPort } from "./types.js";
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

  it("excludes structural commands from the mounted application port", () => {
    type MountedCommand = Parameters<UnifoldApplicationPort["runtime"]["execute"]>[0][number];
    expectTypeOf<Extract<MountedCommand, StructuralCommand>>().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<MountedCommand, ControlSetValueCommand>
    >().toEqualTypeOf<ControlSetValueCommand>();
  });
});

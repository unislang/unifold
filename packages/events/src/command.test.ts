import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import { describe, expect, it } from "vitest";
import * as subject from "./command.js";
import { UiCommandType } from "./enums.js";

describe("command module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("accepts enum-backed collection reconciliation metadata", () => {
    const command: subject.StructureReconcileCommand = {
      collectionOperation: {
        collectionId: "items",
        toIndex: 1,
        type: UiCollectionOperationType.Insert
      },
      compositionInstances: {},
      nodes: [],
      type: UiCommandType.StructureReconcile
    };
    expect(command.collectionOperation?.type).toBe(UiCollectionOperationType.Insert);
  });
});

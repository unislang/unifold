import { Ajv2020 } from "ajv/dist/2020.js";
import { expect, it } from "vitest";

import schema from "../schemas/collection-behavior.schema.json" with { type: "json" };
import { UiCollectionBehaviorVersion } from "./collection-behavior.js";

it("uses one enum-backed collection behavior contract version", () => {
  expect(UiCollectionBehaviorVersion.Version1).toBe("1.0.0");
  expect(schema.properties.contractVersion.const).toBe(UiCollectionBehaviorVersion.Version1);
});

it("executes the closed collection behavior contract", () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const behavior = {
    contractVersion: UiCollectionBehaviorVersion.Version1,
    nodes: [{ collectionId: "items", emptyFocusTargetId: "add-item" }]
  };
  expect(validate(behavior)).toBe(true);
  const node = behavior.nodes[0];
  if (node === undefined) throw new Error("Expected collection behavior fixture.");
  Object.assign(node, { sourcePointer: "/variables/items" });
  expect(validate(behavior)).toBe(false);
});

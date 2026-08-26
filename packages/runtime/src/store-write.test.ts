import { UiCommandType, UiUpdateTrigger } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { controlNode } from "./runtime.test-data.js";
import { captureBoundValues, changedStoreWrites } from "./store-write.js";

const bindings = { field: { path: "/name", storeId: "customer" } };

it("creates a write effect only when a committed bound value changes", () => {
  const before = controlNode("field", "Ada");
  const previous = captureBoundValues(
    [{ id: "field", type: UiCommandType.ControlSetValue, value: "Grace" }],
    bindings,
    [before]
  );
  const after = withValue(before, "Grace");
  expect(changedStoreWrites(previous, bindings, () => after)).toEqual([
    {
      id: "field",
      path: "/name",
      storeId: "customer",
      type: UiCommandType.StoreWrite,
      value: "Grace"
    }
  ]);
  expect(changedStoreWrites(previous, bindings, () => before)).toEqual([]);
});

it("captures bound descendants for form submit and reset", () => {
  const field = { ...controlNode("field", "Ada"), parentId: "form", scopePath: ["form", "field"] };
  const previous = captureBoundValues([{ id: "form", type: UiCommandType.FormSubmit }], bindings, [
    field
  ]);
  expect(previous.get("field")).toBe("Ada");
});

it("omits a write when the bound node was removed by the transaction", () => {
  const before = controlNode("field", "Ada");
  const previous = captureBoundValues(
    [{ id: "field", type: UiCommandType.ControlSetValue, value: "Grace" }],
    bindings,
    [before]
  );
  expect(changedStoreWrites(previous, bindings, () => undefined)).toEqual([]);
});

it("does not treat inherited record properties as bindings", () => {
  const inheritedId = controlNode("toString", "Ada");
  const previous = captureBoundValues(
    [{ id: "toString", type: UiCommandType.ControlSetValue, value: "Grace" }],
    {},
    [inheritedId]
  );

  expect(previous.size).toBe(0);
});

function withValue(snapshot: ReturnType<typeof controlNode>, value: string) {
  if (snapshot.control === undefined) throw new Error("Expected a control fixture.");
  return {
    ...snapshot,
    control: { ...snapshot.control, updateOn: UiUpdateTrigger.Input, value }
  };
}

import {
  UiControlStatus,
  UiNodeKind,
  UiValidationSeverity,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import { describe, expect, it, vi } from "vitest";

import { NormalizedNodeStore } from "./index.js";
import { controlNode } from "./test-helpers.js";

describe("aggregate controls", () => {
  it("creates coherent form values and excludes disabled children", verifyFormAggregation);
  it("recomputes nested group state in the same transaction", verifyNestedAggregation);
  it("preserves ordered array values and status precedence", verifyArrayAggregation);
  it("keeps tentative and committed aggregate values distinct", verifyRawAggregation);
  it("runs an injected validator against the recomputed aggregate", verifyAggregateValidation);
  it("validates only aggregates affected by a leaf update", verifyIncrementalValidation);
});

function verifyFormAggregation(): void {
  const name = namedControl("name-node", "Ada", "form", "name");
  const secret = disabledControl(namedControl("secret-node", "hidden", "form", "secret"));
  const store = new NormalizedNodeStore([aggregateNode("form", UiNodeKind.Form), name, secret]);
  const control = requireControl(store.getSnapshot("form"));
  expect(control.value).toEqual({ name: "Ada" });
  expect(control.rawValue).toEqual({ name: "Ada", secret: "hidden" });
  expect(control.initialValue).toEqual({ name: "Ada", secret: "hidden" });
}

function verifyNestedAggregation(): void {
  const group = aggregateNode("address", UiNodeKind.Group, "form");
  const city = namedControl("city-node", "London", "address", "city");
  const store = new NormalizedNodeStore([aggregateNode("form", UiNodeKind.Form), group, city]);
  const record = store.transact(metadata, (draft) => {
    draft.update("city-node", (node) => {
      if (node.control === undefined) throw new Error("Expected a control.");
      Object.assign(node.control, {
        dirty: true,
        pristine: false,
        status: UiControlStatus.Invalid,
        value: "Paris"
      });
    });
  });
  expect(requireControl(store.getSnapshot("form"))).toMatchObject({
    dirty: true,
    status: UiControlStatus.Invalid,
    value: { address: { city: "Paris" } }
  });
  expect(record.changedNodeIds).toEqual(expect.arrayContaining(["city-node", "address", "form"]));
}

function verifyArrayAggregation(): void {
  const first = controlNode("first", "A", "items");
  const secondBase = controlNode("second", "B", "items");
  const second = {
    ...secondBase,
    control: { ...requireControl(secondBase), pending: true, status: UiControlStatus.Pending }
  };
  const store = new NormalizedNodeStore([aggregateNode("items", UiNodeKind.Array), first, second]);
  expect(requireControl(store.getSnapshot("items"))).toMatchObject({
    pending: true,
    status: UiControlStatus.Pending,
    value: ["A", "B"]
  });
}

function verifyRawAggregation(): void {
  const field = namedControl("field", "Committed", "form", "field");
  const store = new NormalizedNodeStore([aggregateNode("form", UiNodeKind.Form), field]);
  store.transact(metadata, (draft) => {
    draft.update("field", (node) => {
      if (node.control === undefined) throw new Error("Expected a control.");
      Object.assign(node.control, { rawValue: "Tentative" });
    });
  });
  expect(requireControl(store.getSnapshot("form"))).toMatchObject({
    rawValue: { field: "Tentative" },
    value: { field: "Committed" }
  });
}

function verifyAggregateValidation(): void {
  const field = invalidControl(namedControl("field", "Ada", "form", "field"));
  const store = new NormalizedNodeStore([aggregateNode("form", UiNodeKind.Form), field], {
    aggregateValidator: (node) => ({
      ...requireControl(node),
      errors: [aggregateError(node.id)],
      status: UiControlStatus.Invalid
    })
  });
  expect(requireControl(store.getSnapshot("form"))).toMatchObject({
    errors: [
      { affectedIds: ["field"], code: "cross-field" },
      { affectedIds: ["form"], code: "cross-field" }
    ],
    status: UiControlStatus.Invalid,
    value: { field: "Ada" }
  });
}

function verifyIncrementalValidation(): void {
  const validate = vi.fn((node: UiNodeSnapshot) => requireControl(node));
  const nodes = [
    aggregateNode("first-form", UiNodeKind.Form),
    namedControl("first-field", "A", "first-form", "field"),
    aggregateNode("second-form", UiNodeKind.Form),
    namedControl("second-field", "B", "second-form", "field")
  ];
  const store = new NormalizedNodeStore(nodes, { aggregateValidator: validate });
  validate.mockClear();
  store.transact(metadata, (draft) => {
    draft.update("first-field", (node) => {
      if (node.control !== undefined) Object.assign(node.control, { value: "C" });
    });
  });
  expect(validate.mock.calls.map(([node]) => node.id)).toEqual(["first-form"]);
}

function invalidControl(node: UiNodeSnapshot): UiNodeSnapshot {
  return {
    ...node,
    control: {
      ...requireControl(node),
      errors: [aggregateError(node.id)],
      status: UiControlStatus.Invalid
    }
  };
}

function aggregateError(id: string) {
  return {
    affectedIds: [id],
    code: "cross-field",
    messageKey: "validation.cross-field",
    severity: UiValidationSeverity.Error,
    validatorId: "cross-field"
  };
}

function aggregateNode(id: string, kind: UiNodeKind, parentId?: string): UiNodeSnapshot {
  const value = { ...controlNode(id, "", parentId), kind, type: "Aggregate" };
  delete value.control;
  return value;
}

function namedControl(id: string, value: string, parentId: string, name: string): UiNodeSnapshot {
  return { ...controlNode(id, value, parentId), properties: { name } };
}

function disabledControl(node: UiNodeSnapshot): UiNodeSnapshot {
  return {
    ...node,
    base: { ...node.base, disabled: true },
    control: { ...requireControl(node), status: UiControlStatus.Disabled }
  };
}

function requireControl(node: UiNodeSnapshot) {
  if (node.control === undefined) throw new Error(`Expected control state for ${node.id}.`);
  return node.control;
}

const metadata = {
  causationId: "cause",
  correlationId: "correlation",
  id: "transaction",
  timestamp: "2026-08-24T00:00:00.000Z"
};

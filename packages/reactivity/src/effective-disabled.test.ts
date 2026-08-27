import { UiControlStatus, UiNodeKind, type UiNodeSnapshot } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { NormalizedNodeStore } from "./node-store.js";
import { controlNode } from "./test-helpers.js";

it("cascades effective disabled state through logical rather than visual ancestry", () => {
  const { store, validatedIds } = validatedStore();

  store.transact(metadata, (draft) => {
    draft.update("group", (node) => {
      node.base.ownDisabled = true;
    });
  });

  expect(store.getSnapshot("field")).toMatchObject({
    base: { disabled: true, interactive: false, ownDisabled: false },
    control: { errors: [], pending: false, status: UiControlStatus.Disabled }
  });
  expect(store.getSnapshot("visual-wrapper").base.disabled).toBe(false);
  expect(requireControl(store.getSnapshot("form")).value).toEqual({});

  store.transact(metadata, (draft) => {
    draft.update("group", (node) => {
      node.base.ownDisabled = false;
    });
  });

  expect(store.getSnapshot("field")).toMatchObject({
    base: { disabled: false, interactive: true, ownDisabled: false },
    control: { status: UiControlStatus.Invalid }
  });
  expect(validatedIds).toContain("field");
});

function validatedStore() {
  const validatedIds: string[] = [];
  const validate = (node: UiNodeSnapshot) => {
    validatedIds.push(node.id);
    return { ...requireControl(node), status: UiControlStatus.Invalid };
  };
  return {
    store: new NormalizedNodeStore(topology(), { controlValidator: validate }),
    validatedIds
  };
}

it("retains a child's own disabled intent when its ancestor is enabled", () => {
  const nodes = topology().map((node) =>
    node.id === "field"
      ? { ...node, base: { ...node.base, disabled: true, ownDisabled: true } }
      : node
  );
  const store = new NormalizedNodeStore(nodes);
  store.transact(metadata, (draft) => {
    draft.update("group", (node) => {
      node.base.ownDisabled = true;
    });
  });
  store.transact(metadata, (draft) => {
    draft.update("group", (node) => {
      node.base.ownDisabled = false;
    });
  });
  expect(store.getSnapshot("field")).toMatchObject({
    base: { disabled: true, ownDisabled: true },
    control: { status: UiControlStatus.Disabled }
  });
});

function topology(): UiNodeSnapshot[] {
  const form = aggregate("form", UiNodeKind.Form, ["group"]);
  const group = {
    ...aggregate("group", UiNodeKind.Group, ["field"], "visual-wrapper"),
    controlKey: "group",
    controlParentId: "form"
  };
  const { control: wrapperControl, ...wrapper } = controlNode("visual-wrapper", "", "form");
  void wrapperControl;
  const field = {
    ...controlNode("field", "Ada", "visual-wrapper"),
    controlChildIds: [],
    controlKey: "field",
    controlParentId: "group"
  };
  return [form, wrapper, group, field];
}

function aggregate(
  id: string,
  kind: UiNodeKind,
  controlChildIds: readonly string[],
  parentId?: string
): UiNodeSnapshot {
  return {
    ...controlNode(id, "", parentId),
    controlChildIds,
    kind,
    properties: {},
    type: "Aggregate"
  };
}

function requireControl(node: UiNodeSnapshot) {
  if (node.control === undefined) throw new Error(`Expected control: ${node.id}`);
  return node.control;
}

const metadata = {
  causationId: "cause",
  correlationId: "correlation",
  id: "transaction",
  timestamp: "2026-08-27T00:00:00.000Z"
};

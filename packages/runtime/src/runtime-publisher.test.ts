import {
  DataClassification,
  UiCommandType,
  UiEventDisclosureMode,
  UiEventRedactionReason,
  UiEventType,
  UiTransactionStatus,
  type UiEvent,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import { createEventFabric } from "@unislang/unifold-reactivity";
import { XStateEventRouter } from "@unislang/unifold-xstate";
import { expect, it } from "vitest";

import { controlNode } from "./runtime.test-data.js";
import { RuntimePublisher } from "./runtime-publisher.js";

it("publishes ordered store effects without exposing the written value", () => {
  const events: UiEvent[] = [];
  const publisher = publisherFor([controlNode("field", "Grace")], events);
  publisher.effect(
    UiEventType.EffectCompleted,
    {
      id: "field",
      path: "/name",
      storeId: "customer",
      type: UiCommandType.StoreWrite,
      value: "Grace"
    },
    { causationId: "cause", correlationId: "correlation", transactionId: "transaction" },
    transaction()
  );
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ data: { sourceNode: { id: "field" } } });
  expect(events[0]).toMatchObject({
    data: {
      disclosure: {
        mode: UiEventDisclosureMode.MetadataOnly,
        reason: UiEventRedactionReason.StoreWrite
      }
    }
  });
  expect((events[0] as UiEvent).data.snapshot).toBeUndefined();
  expect(JSON.stringify(events[0])).not.toContain("Grace");
});

it("uses the maximum pre/post classification for transaction disclosure", () => {
  const publicNode = controlNode("field", "public-value");
  const restrictedNode = classifiedNode("removed", DataClassification.NeverExport);
  const events: UiEvent[] = [];
  const publisher = publisherFor([publicNode], events);
  publisher.transaction(executionContext(), transaction(["field", "removed"]), [
    publicNode,
    restrictedNode
  ]);
  expect(events[0]).toMatchObject({
    data: { disclosure: { classification: DataClassification.NeverExport } }
  });
  expect((events[0] as UiEvent).data.snapshot).toBeUndefined();
  expect(JSON.stringify(events[0])).not.toContain("secret-value");
});

it("uses the maximum descendant classification for form disclosure", () => {
  const form = controlNode("form", "aggregate");
  const secret = classifiedNode("secret", DataClassification.Restricted, "form");
  const events: UiEvent[] = [];
  const publisher = publisherFor([form, secret], events);
  publisher.formResult(
    { id: "form", type: UiCommandType.FormSubmit },
    executionContext(),
    transaction(["form"])
  );
  expect(events[0]).toMatchObject({
    data: { change: {}, disclosure: { classification: DataClassification.Restricted } }
  });
  expect(JSON.stringify(events[0])).not.toContain("aggregate");
});

it("projects a transaction from its causal command target", () => {
  const form = controlNode("form", "aggregate");
  const field = controlNode("field", "Ada", "form");
  const events: UiEvent[] = [];
  const publisher = publisherFor([form, field], events);
  publisher.transaction(
    executionContext(),
    transaction(["form", "field"]),
    [form, field],
    [{ id: "field", type: UiCommandType.ControlSetValue, value: "Ada" }]
  );
  expect(events[0]).toMatchObject({
    data: {
      change: { changedNodeIds: ["form", "field"] },
      sourceNode: { id: "field", scopePath: ["form", "field"] }
    }
  });
});

function transaction(changedNodeIds: readonly string[] = ["field"]) {
  return {
    changedNodeIds,
    changedPaths: ["/nodes/field/control/value"],
    correlationId: "correlation",
    id: "transaction",
    previousRevision: 0,
    revision: 1,
    status: UiTransactionStatus.Committed,
    timestamp: "2026-08-25T00:00:00.000Z"
  };
}

function publisherFor(snapshots: readonly UiNodeSnapshot[], events: UiEvent[]) {
  const fabric = createEventFabric();
  fabric.fabric.events$.subscribe((event) => events.push(event));
  return new RuntimePublisher({
    actors: new XStateEventRouter(),
    createId: () => "event-1",
    documentId: "document-1",
    fabric,
    now: () => "2026-08-25T00:00:00.000Z",
    snapshot: (id) => snapshots.find((snapshot) => snapshot.id === id),
    snapshots: () => snapshots,
    source: "urn:unifold:runtime:document-1"
  });
}

function classifiedNode(id: string, classification: DataClassification, parentId?: string) {
  const node = controlNode(id, "secret-value", parentId);
  return { ...node, base: { ...node.base, dataClassification: classification } };
}

function executionContext() {
  return { causationId: "cause", correlationId: "correlation", transactionId: "transaction" };
}

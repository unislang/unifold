// @vitest-environment happy-dom
import {
  UiCollectionOperationType,
  UiControlNodeKind,
  UiControlTopologyVersion
} from "@unislang/unifold-contracts";
import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  UnifoldApplicationUpdateStatus,
  mountUnifoldApplication,
  type UnifoldCollectionInsertOperation,
  type UnifoldCollectionMoveOperation,
  type UnifoldCollectionRemoveOperation
} from "./index.js";
import {
  requireApplication,
  requireElement,
  requireInput,
  updateComplete
} from "./application.test-data.js";

it("compiles and renders durable collection insert, move, and remove operations", async () => {
  const fixture = await mountedEditedCollection();
  assertInsertedCollection(fixture);
  await assertMovedAndRemovedCollection(fixture);
  assertCollectionEvidence(fixture);
  fixture.subscription.unsubscribe();
  fixture.application.dispose();
  fixture.container.remove();
});

async function mountedEditedCollection() {
  const container = document.createElement("main");
  document.body.append(container);
  const application = requireApplication(mountUnifoldApplication(collectionDocument(), container));
  const events: UiEvent[] = [];
  const subscription = application.runtime.events$.subscribe((event) => events.push(event));
  const alpha = requireElement(application, "field::a");
  await updateComplete(alpha);
  const input = requireInput(alpha);
  application.runtime.execute([
    { id: "field::a", type: UiCommandType.ControlSetValue, value: "Edited" }
  ]);
  input.focus();
  return { alpha, application, container, events, input, subscription };
}

type CollectionFixture = Awaited<ReturnType<typeof mountedEditedCollection>>;

function assertInsertedCollection(fixture: CollectionFixture): void {
  const result = fixture.application.applyCollectionOperation(insertOperation());
  expect(result.diagnostics).toEqual([]);
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(fixture.application.renderer.getElement("field::a")).toBe(fixture.alpha);
  expect(controlValue(fixture, "field::a")).toBe("Edited");
  expect(fixture.alpha.shadowRoot?.activeElement).toBe(fixture.input);
  expect(renderedIds(fixture.container)).toEqual(["field::a", "field::c", "field::b"]);
  expect(controlValue(fixture, "items")).toEqual(["Edited", "Gamma", "Beta"]);
}

function controlValue(fixture: CollectionFixture, id: string): unknown {
  return fixture.application.runtime.getSnapshot(id).control?.value;
}

async function assertMovedAndRemovedCollection(fixture: CollectionFixture): Promise<void> {
  expect(fixture.application.applyCollectionOperation(moveOperation()).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  expect(renderedIds(fixture.container)).toEqual(["field::b", "field::a", "field::c"]);
  expect(controlValue(fixture, "items")).toEqual(["Beta", "Edited", "Gamma"]);
  const gamma = requireElement(fixture.application, "field::c");
  await updateComplete(gamma);
  requireInput(gamma).focus();
  const removed = fixture.application.applyCollectionOperation(removeOperation(), {
    causationId: "collection-remove",
    correlationId: "collection-journey"
  });
  expect(removed.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(renderedIds(fixture.container)).toEqual(["field::b", "field::a"]);
  expect(controlValue(fixture, "items")).toEqual(["Beta", "Edited"]);
  expect(fixture.alpha.shadowRoot?.activeElement).toBe(fixture.input);
}

function assertCollectionEvidence(fixture: CollectionFixture): void {
  const authored = fixture.application.authored as ReturnType<typeof collectionDocument>;
  expect(authored.variables.items).toEqual([
    { id: "b", label: "Beta" },
    { id: "a", label: "Alpha" }
  ]);
  expect(structuralEvents(fixture.events)).toHaveLength(3);
  expect(focusEvents(fixture.events)).toMatchObject([
    {
      causationid: "collection-remove",
      correlationid: "collection-journey",
      data: { sourceNode: { id: "field::a" } }
    }
  ]);
  expect(
    fixture.events.filter(({ type }) => type === UiEventType.TransactionCommitted)
  ).toHaveLength(5);
}

it("retains last-known-good authored, runtime, and DOM state after rejection", () => {
  const container = document.createElement("main");
  const application = requireApplication(mountUnifoldApplication(collectionDocument(), container));
  const alpha = application.renderer.getElement("field::a");
  const revision = application.runtime.revision;
  const rejected = application.applyCollectionOperation({
    ...insertOperation(),
    item: { id: "c", label: { invalid: true } }
  });
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(application.runtime.revision).toBe(revision);
  expect(application.renderer.getElement("field::a")).toBe(alpha);
  expect(application.renderer.getElement("field::c")).toBeUndefined();
  expect(application.authored).toMatchObject({ revision: "1" });
  application.dispose();
});

it("propagates trusted collection lineage without admitting transaction spoofing", () => {
  const application = requireApplication(
    mountUnifoldApplication(collectionDocument(), document.createElement("main"))
  );
  const events: UiEvent[] = [];
  application.runtime.events$.subscribe((event) => events.push(event));
  const result = application.applyCollectionOperation(insertOperation(), {
    causationId: "collection-insert",
    correlationId: "collection-journey",
    transactionId: "spoofed"
  } as { causationId: string; correlationId: string; transactionId: string });
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(events.length).toBeGreaterThan(0);
  expect(events.every((event) => event.correlationid === "collection-journey")).toBe(true);
  expect(events.every((event) => event.causationid === "collection-insert")).toBe(true);
  expect(events.every((event) => event.transactionid !== "spoofed")).toBe(true);
  application.dispose();
});

it("rejects a collection update reentered from the synchronous public event stream", () => {
  const container = document.createElement("main");
  const application = requireApplication(mountUnifoldApplication(collectionDocument(), container));
  let nested: ReturnType<typeof application.applyCollectionOperation> | undefined;
  const subscription = application.runtime.events$.subscribe((event) => {
    if (nested !== undefined || structuralEvents([event]).length === 0) return;
    nested = application.applyCollectionOperation(moveAfterInsertOperation());
  });
  const outer = application.applyCollectionOperation(insertOperation());
  expect(outer.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(nested).toMatchObject({
    diagnostics: [{ code: "application-update-in-progress" }],
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(application.authored).toMatchObject({
    revision: "2",
    variables: { items: [{ id: "a" }, { id: "c" }, { id: "b" }] }
  });
  expect(renderedIds(container)).toEqual(["field::a", "field::c", "field::b"]);
  subscription.unsubscribe();
  application.dispose();
});

it("requires named collections to own an explicit array or record control", () => {
  const missing = collectionDocument();
  Reflect.deleteProperty(missing, "controls");
  expect(mountUnifoldApplication(missing, document.createElement("main"))).toMatchObject({
    diagnostics: [{ path: "/layouts/0/template/children/0/children/0/collection" }],
    status: "rejected"
  });
  const incompatible = collectionDocument();
  incompatible.controls.nodes[1] = {
    id: "items",
    key: "items",
    kind: UiControlNodeKind.Group,
    parentId: "collection-form"
  };
  expect(mountUnifoldApplication(incompatible, document.createElement("main"))).toMatchObject({
    diagnostics: [{ path: "/layouts/0/template/children/0/children/0/collection" }],
    status: "rejected"
  });
});

it("projects the same named repeat through record authority by durable key", () => {
  const source = collectionDocument();
  source.controls.nodes[1] = {
    id: "items",
    key: "items",
    kind: UiControlNodeKind.Record,
    parentId: "collection-form"
  };
  const application = requireApplication(
    mountUnifoldApplication(source, document.createElement("main"))
  );
  expect(application.runtime.getSnapshot("items")).toMatchObject({
    control: { value: { a: "Alpha", b: "Beta" } },
    controlChildIds: ["field::a", "field::b"]
  });
  application.dispose();
});

function collectionDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    controls: collectionControls(),
    id: "collection-page",
    layoutType: "collection",
    layoutVersion: "1.0.0",
    layouts: [collectionLayout()],
    revision: "1",
    schemaVersion: "1.0.0",
    variables: {
      items: [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" }
      ]
    }
  };
}

function collectionLayout() {
  return {
    layoutType: "collection",
    template: {
      children: [
        {
          children: [
            {
              collection: "items",
              for: "item in {{items}}",
              id: "field",
              key: "id",
              props: { label: "{{item.label}}", value: "{{item.label}}" },
              type: "TextField"
            }
          ],
          id: "items",
          type: "Stack"
        }
      ],
      id: "collection-form",
      type: "Form"
    },
    variables: { items: { required: true, type: "array" } },
    version: "1.0.0"
  };
}

function collectionControls() {
  return {
    contractVersion: UiControlTopologyVersion.Version1,
    nodes: [
      { id: "collection-form", kind: UiControlNodeKind.Form },
      {
        id: "items",
        key: "items",
        kind: UiControlNodeKind.Array,
        parentId: "collection-form"
      }
    ]
  };
}

function insertOperation(): UnifoldCollectionInsertOperation {
  return {
    collectionId: "items",
    expectedRevision: "1",
    index: 1,
    item: { id: "c", label: "Gamma" },
    revision: "2",
    type: UiCollectionOperationType.Insert
  };
}

function moveOperation(): UnifoldCollectionMoveOperation {
  return {
    collectionId: "items",
    expectedRevision: "2",
    index: 0,
    key: "b",
    revision: "3",
    type: UiCollectionOperationType.Move
  };
}

function moveAfterInsertOperation(): UnifoldCollectionMoveOperation {
  return { ...moveOperation(), key: "b" };
}

function removeOperation(): UnifoldCollectionRemoveOperation {
  return {
    collectionId: "items",
    expectedRevision: "3",
    key: "c",
    revision: "4",
    type: UiCollectionOperationType.Remove
  };
}

function renderedIds(container: HTMLElement): readonly string[] {
  return composedElements(container)
    .filter(({ dataset }) => dataset["unifoldNodeId"]?.startsWith("field::") === true)
    .map(({ id }) => id);
}

function composedElements(root: ParentNode): readonly HTMLElement[] {
  return [...root.children].flatMap((child) => {
    const element = child as HTMLElement;
    return [
      element,
      ...composedElements(element),
      ...(element.shadowRoot === null ? [] : composedElements(element.shadowRoot))
    ];
  });
}

function structuralEvents(events: readonly UiEvent[]): readonly UiEvent[] {
  return events.filter(
    (event) =>
      event.type === UiEventType.CommandApplied &&
      commandTypeOf(event) === UiCommandType.StructureReconcile
  );
}

function focusEvents(events: readonly UiEvent[]): readonly UiEvent[] {
  return events.filter(
    (event) =>
      event.type === UiEventType.CommandApplied &&
      commandTypeOf(event) === UiCommandType.FocusRequest
  );
}

function commandTypeOf(event: UiEvent): unknown {
  const change = event.data.change as Readonly<Record<string, unknown>> | undefined;
  return change?.["commandType"];
}

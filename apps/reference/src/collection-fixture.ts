import {
  UiCollectionOperationType,
  UiControlNodeKind,
  UiControlTopologyVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import { UiValidationSeverity, type UiEvent } from "@unislang/unifold-events";
import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import { createAsyncValidatorRegistry, type UiValidationContext } from "@unislang/unifold-forms";
import {
  collectionOperationTypes,
  focusedNodeId,
  focusRequestIds,
  lateRemovedEventCount,
  operationEventsAreCausal,
  operationEventsHaveTrustedOrigin,
  renderedNodeIds
} from "./collection-event-evidence.js";

interface CollectionFixtureWindow {
  __unifoldCollectionFixture?: CollectionFixtureHooks;
}

interface CollectionFixtureHooks {
  bypass(): boolean;
  empty(): UnifoldApplicationUpdateStatus;
  insert(): UnifoldApplicationUpdateStatus;
  mount(): UnifoldApplicationMountStatus;
  move(): UnifoldApplicationUpdateStatus;
  observe(): CollectionFixtureObservation;
  reject(): UnifoldApplicationUpdateStatus;
  remove(): UnifoldApplicationUpdateStatus;
  removeFocused(): UnifoldApplicationUpdateStatus;
}

interface CollectionFixtureObservation {
  readonly aggregateValue: unknown;
  readonly alphaRetained: boolean;
  readonly alphaValue: unknown;
  readonly authoredKeys: readonly string[];
  readonly focusedId?: string;
  readonly focusRequestIds: readonly string[];
  readonly lateRemovedEvents: number;
  readonly operationEventsCausal: boolean;
  readonly operationEventsOriginated: boolean;
  readonly operationTypes: readonly UiCollectionOperationType[];
  readonly renderedIds: readonly string[];
  readonly revision: string;
}

interface MountedCollectionFixture {
  readonly alpha: HTMLElement;
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly events: UiEvent[];
  removedAtSequence?: number;
}

let mounted: MountedCollectionFixture | undefined;

function installCollectionFixtureHooks(): void {
  (window as unknown as CollectionFixtureWindow).__unifoldCollectionFixture = {
    bypass: denyStructuralBypass,
    empty: emptyCollection,
    insert: insertCollectionItem,
    mount: mountCollectionFixture,
    move: moveCollectionItem,
    observe: observeCollectionFixture,
    reject: rejectCollectionItem,
    remove: removeCollectionItem,
    removeFocused: removeFocusedCollectionItem
  };
}

installCollectionFixtureHooks();

function mountCollectionFixture(): UnifoldApplicationMountStatus {
  disposeCollectionFixture();
  const container = document.createElement("section");
  container.dataset["testid"] = "collection-fixture";
  document.body.append(container);
  const result = mountUnifoldApplication(collectionDocument(), container, {
    runtime: { asyncValidatorRegistry: collectionValidators() }
  });
  if (result.status === UnifoldApplicationMountStatus.Rejected) return result.status;
  const events: UiEvent[] = [];
  result.application.runtime.events$.subscribe((event) => events.push(event));
  mounted = {
    alpha: requireElement(result.application, "field::a"),
    application: result.application,
    container,
    events
  };
  return result.status;
}

function insertCollectionItem(): UnifoldApplicationUpdateStatus {
  const fixture = requireCollectionFixture();
  return fixture.application.applyCollectionOperation(
    {
      collectionId: "items",
      expectedRevision: "1",
      index: 1,
      item: { id: "c", label: "Gamma" },
      revision: "2",
      type: UiCollectionOperationType.Insert
    },
    collectionOrigin(UiCollectionOperationType.Insert)
  ).status;
}

function moveCollectionItem(): UnifoldApplicationUpdateStatus {
  return requireCollectionFixture().application.applyCollectionOperation(
    {
      collectionId: "items",
      expectedRevision: "2",
      index: 0,
      key: "b",
      revision: "3",
      type: UiCollectionOperationType.Move
    },
    collectionOrigin(UiCollectionOperationType.Move)
  ).status;
}

function removeCollectionItem(): UnifoldApplicationUpdateStatus {
  const fixture = requireCollectionFixture();
  const status = fixture.application.applyCollectionOperation(
    {
      collectionId: "items",
      expectedRevision: "3",
      key: "c",
      revision: "4",
      type: UiCollectionOperationType.Remove
    },
    collectionOrigin(UiCollectionOperationType.Remove)
  ).status;
  fixture.removedAtSequence = fixture.events.at(-1)?.sequence ?? 0;
  return status;
}

function rejectCollectionItem(): UnifoldApplicationUpdateStatus {
  return requireCollectionFixture().application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision: "4",
    index: 1,
    item: { id: "invalid", label: { executable: false } },
    revision: "5",
    type: UiCollectionOperationType.Insert
  }).status;
}

function removeFocusedCollectionItem() {
  return removeByKey("a", "4", "5");
}

function emptyCollection() {
  return removeByKey("b", "5", "6");
}

function removeByKey(key: string, expectedRevision: string, revision: string) {
  return requireCollectionFixture().application.applyCollectionOperation(
    {
      collectionId: "items",
      expectedRevision,
      key,
      revision,
      type: UiCollectionOperationType.Remove
    },
    collectionOrigin(UiCollectionOperationType.Remove)
  ).status;
}

function observeCollectionFixture(): CollectionFixtureObservation {
  const fixture = requireCollectionFixture();
  const authored = fixture.application.authored as ReturnType<typeof collectionDocument>;
  return {
    aggregateValue: fixture.application.runtime.getSnapshot("items").control?.value,
    alphaRetained: fixture.application.renderer.getElement("field::a") === fixture.alpha,
    alphaValue: controlValue(fixture, "field::a"),
    authoredKeys: authored.variables.items.map(({ id }) => id),
    ...optionalFocusedId(focusedNodeId(document.body)),
    focusRequestIds: focusRequestIds(fixture.events),
    lateRemovedEvents: lateRemovedEventCount(fixture.events, fixture.removedAtSequence),
    operationEventsCausal: operationEventsAreCausal(fixture.events),
    operationEventsOriginated: operationEventsHaveTrustedOrigin(fixture.events),
    operationTypes: collectionOperationTypes(fixture.events),
    renderedIds: renderedNodeIds(fixture.container),
    revision: authored.revision
  };
}

function collectionOrigin(type: UiCollectionOperationType) {
  return { causationId: `collection-${type}`, correlationId: "collection-journey" };
}

function denyStructuralBypass(): boolean {
  const fixture = requireCollectionFixture();
  const revision = fixture.application.runtime.revision;
  const alpha = fixture.application.renderer.getElement("field::a");
  try {
    (fixture.application.runtime.execute as (commands: readonly unknown[]) => unknown)([
      { id: "field::a", type: "structure.remove" }
    ]);
    return false;
  } catch {
    return (
      fixture.application.runtime.revision === revision &&
      fixture.application.renderer.getElement("field::a") === alpha
    );
  }
}

function collectionValidators() {
  const registry = createAsyncValidatorRegistry();
  registry.register("non-cooperative", { validate: validateNonCooperative });
  return registry;
}

async function validateNonCooperative(context: UiValidationContext) {
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  if (context.value !== "taken") return [];
  return [
    {
      affectedIds: [context.node.id],
      code: "late-value",
      messageKey: "validation.late-value",
      ownerId: context.node.id,
      parameters: {},
      severity: UiValidationSeverity.Error,
      validatorId: "non-cooperative"
    }
  ];
}

function collectionDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    controls: collectionControls(),
    id: "collection-fixture",
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
        { children: [collectionField()], id: "items", type: "Stack" },
        { id: "add-item", props: { label: "Add item" }, type: "Button" }
      ],
      id: "collection-form",
      type: "Form"
    },
    variables: { items: { required: true, type: "array" } },
    version: "1.0.0"
  };
}

function collectionField(): JsonObject {
  return {
    collection: "items",
    emptyFocusTarget: "add-item",
    for: "item in {{items}}",
    id: "field",
    key: "id",
    props: {
      asyncValidators: ["non-cooperative"],
      label: "{{item.label}}",
      value: "{{item.label}}"
    },
    type: "TextField"
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

function controlValue(fixture: MountedCollectionFixture, id: string): unknown {
  if (fixture.application.renderer.getElement(id) === undefined) return undefined;
  return fixture.application.runtime.getSnapshot(id).control?.value;
}

function optionalFocusedId(id: string | undefined): { readonly focusedId?: string } {
  return id === undefined ? {} : { focusedId: id };
}

function requireCollectionFixture(): MountedCollectionFixture {
  if (mounted === undefined) throw new Error("Collection fixture is not mounted.");
  return mounted;
}

function requireElement(application: UnifoldApplicationPort, id: string): HTMLElement {
  const element = application.renderer.getElement(id);
  if (element === undefined) throw new Error(`Collection node is missing: ${id}.`);
  return element;
}

function disposeCollectionFixture(): void {
  mounted?.application.dispose();
  mounted?.container.remove();
  mounted = undefined;
}

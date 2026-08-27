import { UiCollectionOperationType, type JsonObject } from "@unislang/unifold-contracts";
import { UiEventType, UiValidationSeverity, type UiEvent } from "@unislang/unifold-events";
import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import { createAsyncValidatorRegistry, type UiValidationContext } from "@unislang/unifold-forms";

interface CollectionFixtureWindow {
  __unifoldCollectionFixture?: CollectionFixtureHooks;
}

interface CollectionFixtureHooks {
  insert(): UnifoldApplicationUpdateStatus;
  mount(): UnifoldApplicationMountStatus;
  move(): UnifoldApplicationUpdateStatus;
  observe(): CollectionFixtureObservation;
  reject(): UnifoldApplicationUpdateStatus;
  remove(): UnifoldApplicationUpdateStatus;
}

interface CollectionFixtureObservation {
  readonly alphaRetained: boolean;
  readonly alphaValue: unknown;
  readonly authoredKeys: readonly string[];
  readonly focusedId?: string;
  readonly lateRemovedEvents: number;
  readonly operationEventsCausal: boolean;
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
    insert: insertCollectionItem,
    mount: mountCollectionFixture,
    move: moveCollectionItem,
    observe: observeCollectionFixture,
    reject: rejectCollectionItem,
    remove: removeCollectionItem
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
  return fixture.application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision: "1",
    index: 1,
    item: { id: "c", label: "Gamma" },
    revision: "2",
    type: UiCollectionOperationType.Insert
  }).status;
}

function moveCollectionItem(): UnifoldApplicationUpdateStatus {
  return requireCollectionFixture().application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision: "2",
    index: 0,
    key: "b",
    revision: "3",
    type: UiCollectionOperationType.Move
  }).status;
}

function removeCollectionItem(): UnifoldApplicationUpdateStatus {
  const fixture = requireCollectionFixture();
  const status = fixture.application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision: "3",
    key: "c",
    revision: "4",
    type: UiCollectionOperationType.Remove
  }).status;
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

function observeCollectionFixture(): CollectionFixtureObservation {
  const fixture = requireCollectionFixture();
  const authored = fixture.application.authored as ReturnType<typeof collectionDocument>;
  return {
    alphaRetained: fixture.application.renderer.getElement("field::a") === fixture.alpha,
    alphaValue: fixture.application.runtime.getSnapshot("field::a").control?.value,
    authoredKeys: authored.variables.items.map(({ id }) => id),
    ...optionalFocusedId(focusedNodeId()),
    lateRemovedEvents: lateRemovedEventCount(fixture),
    operationEventsCausal: operationEventsAreCausal(fixture.events),
    operationTypes: collectionOperationTypes(fixture.events),
    renderedIds: renderedNodeIds(fixture.container),
    revision: authored.revision
  };
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
      children: [collectionField()],
      id: "collection-root",
      type: "Stack"
    },
    variables: { items: { required: true, type: "array" } },
    version: "1.0.0"
  };
}

function collectionField(): JsonObject {
  return {
    collection: "items",
    for: "item in {{items}}",
    id: "field",
    key: "id",
    props: { asyncValidators: ["non-cooperative"], label: "{{item.label}}" },
    type: "TextField"
  };
}

function collectionOperationTypes(events: readonly UiEvent[]): UiCollectionOperationType[] {
  return events.flatMap((event) => optionalOperationType(eventCollectionOperationType(event)));
}

function eventCollectionOperationType(event: UiEvent): UiCollectionOperationType | undefined {
  if (event.type !== UiEventType.CommandApplied) return undefined;
  return operationType(eventCollectionMetadata(event));
}

function operationType(
  metadata: Readonly<Record<string, unknown>> | undefined
): UiCollectionOperationType | undefined {
  const value = metadata?.["type"];
  return isCollectionOperationType(value) ? value : undefined;
}

function optionalOperationType(
  value: UiCollectionOperationType | undefined
): readonly UiCollectionOperationType[] {
  return value === undefined ? [] : [value];
}

function operationEventsAreCausal(events: readonly UiEvent[]): boolean {
  const operations = events.filter((event) => eventCollectionMetadata(event) !== undefined);
  return operations.every((operation) => hasCausalTransaction(operation, events));
}

function hasCausalTransaction(operation: UiEvent, events: readonly UiEvent[]): boolean {
  const transaction = events.find(({ sequence }) => sequence === operation.sequence + 1);
  if (transaction?.type !== UiEventType.TransactionCommitted) return false;
  return sameEventContext(operation, transaction);
}

function sameEventContext(left: UiEvent, right: UiEvent): boolean {
  return [
    left.transactionid === right.transactionid,
    left.correlationid === right.correlationid,
    left.causationid === right.causationid
  ].every(Boolean);
}

function eventCollectionMetadata(event: UiEvent): Readonly<Record<string, unknown>> | undefined {
  const change = record(event.data.change);
  return record(change?.["collectionOperation"]);
}

function isCollectionOperationType(value: unknown): value is UiCollectionOperationType {
  return Object.values(UiCollectionOperationType).includes(value as UiCollectionOperationType);
}

function lateRemovedEventCount(fixture: MountedCollectionFixture): number {
  const removedAt = fixture.removedAtSequence;
  if (removedAt === undefined) return 0;
  return fixture.events.filter((event) => isLateRemovedEvent(event, removedAt)).length;
}

function isLateRemovedEvent(event: UiEvent, removedAt: number): boolean {
  if (event.sequence <= removedAt) return false;
  return event.data.sourceNode?.id === "field::c";
}

function renderedNodeIds(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll<HTMLElement>("[data-unifold-node-id^='field::']")].map(
    ({ id }) => id
  );
}

function focusedNodeId(): string | undefined {
  const active = document.activeElement as HTMLElement | null;
  return active?.dataset["unifoldNodeId"];
}

function optionalFocusedId(id: string | undefined): { readonly focusedId?: string } {
  return id === undefined ? {} : { focusedId: id };
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isObject(value)) return undefined;
  return Array.isArray(value) ? undefined : (value as Readonly<Record<string, unknown>>);
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
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

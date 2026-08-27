import {
  UiCommandType,
  UiTransactionStatus,
  type UiCommand,
  type UiEvent,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiTransactionMetadata,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type { UiCompositionInstanceManifest } from "@unislang/unifold-contracts";
import {
  createAsyncValidatorRegistry,
  createValidatorRegistry,
  withValidatedControl,
  type UiValidatorRegistryPort
} from "@unislang/unifold-forms";
import type { AggregateControlValidator, NormalizedNodeStore } from "@unislang/unifold-reactivity";

import type {
  UiRuntimeInspectionSnapshot,
  UiResolvedRuntimeExecutionContext,
  UiRuntimeStoreBinding,
  UnifoldRuntimeOptions
} from "./types.js";

export function resolveRuntimeExecutionContext(
  input: import("./types.js").UiRuntimeExecutionContext,
  createId: () => string
): UiResolvedRuntimeExecutionContext {
  const transactionId = valueOrCreate(input.transactionId, createId);
  return {
    transactionId,
    correlationId: valueOrDefault(input.correlationId, transactionId),
    causationId: valueOrDefault(input.causationId, transactionId),
    ...(input.effectSourceId === undefined ? {} : { effectSourceId: input.effectSourceId }),
    suppressedStoreWriteIds: input.suppressedStoreWriteIds ?? []
  };
}

export function readRuntimeSnapshot(
  store: NormalizedNodeStore,
  id: UiNodeId
): UiNodeSnapshot | undefined {
  try {
    return store.getSnapshot(id);
  } catch {
    return undefined;
  }
}

export function requireIntentSnapshot(store: NormalizedNodeStore, event: UiEvent): UiNodeSnapshot {
  const source = event.data.sourceNode;
  if (source === undefined) throw new Error("Intent source node is missing.");
  const snapshot = readRuntimeSnapshot(store, source.id);
  if (snapshot === undefined) throw new Error(`Intent source node is unknown: ${source.id}.`);
  return snapshot;
}

export function transactionMetadata(
  context: { causationId: string; correlationId: string; transactionId: string },
  timestamp: string
): UiTransactionMetadata {
  return {
    id: context.transactionId,
    correlationId: context.correlationId,
    causationId: context.causationId,
    timestamp
  };
}

export function validatorRegistry(options: UnifoldRuntimeOptions): UiValidatorRegistryPort {
  return options.validatorRegistry ?? createValidatorRegistry();
}

export function asyncValidatorRegistry(options: UnifoldRuntimeOptions) {
  return options.asyncValidatorRegistry ?? createAsyncValidatorRegistry();
}

export function commandNodeId(command: UiCommand): UiNodeId | undefined {
  if ("id" in command) return command.id;
  if (command.type === UiCommandType.StructureInstantiate) return command.node.id;
  return undefined;
}

export function transactionSourceId(
  commands: readonly UiCommand[],
  changedNodeIds: readonly UiNodeId[]
): UiNodeId | undefined {
  const changed = new Set(changedNodeIds);
  return commands.map(commandNodeId).find((id) => id !== undefined && changed.has(id));
}

export function rejectedRecord(
  context: { causationId: string; correlationId: string; transactionId: string },
  revision: number,
  now: () => string
): UiTransactionRecord {
  return {
    ...transactionMetadata(context, now()),
    previousRevision: revision,
    revision,
    changedNodeIds: [],
    changedPaths: [],
    status: UiTransactionStatus.Rejected
  };
}

export function unchangedRecord(
  context: { causationId: string; correlationId: string; transactionId: string },
  revision: number,
  timestamp: string
): UiTransactionRecord {
  return {
    ...transactionMetadata(context, timestamp),
    previousRevision: revision,
    revision,
    changedNodeIds: [],
    changedPaths: [],
    status: UiTransactionStatus.Committed
  };
}

export function storeOptions(validators: UiValidatorRegistryPort, transactionRetention?: number) {
  const aggregateValidator = aggregateValidation(validators);
  const controlValidator = aggregateValidator;
  return transactionRetention === undefined
    ? { aggregateValidator, controlValidator }
    : { aggregateValidator, controlValidator, transactionRetention };
}

function aggregateValidation(validators: UiValidatorRegistryPort): AggregateControlValidator {
  return (node) => requireControl(withValidatedControl(node, validators));
}

function requireControl(node: UiNodeSnapshot) {
  if (node.control === undefined) throw new Error(`Aggregate control is missing: ${node.id}.`);
  return node.control;
}

export function initialNodes(nodes?: readonly UiNodeSnapshot[]): readonly UiNodeSnapshot[] {
  return nodes ?? [];
}

export function initialCompositions(
  instances?: Readonly<Record<string, UiCompositionInstanceManifest>>
): Readonly<Record<string, UiCompositionInstanceManifest>> {
  return instances ?? {};
}

export function initialStoreBindings(
  options: UnifoldRuntimeOptions
): Readonly<Record<UiNodeId, UiRuntimeStoreBinding>> {
  return options.storeBindings ?? {};
}

export function runtimeInspection(store: NormalizedNodeStore): UiRuntimeInspectionSnapshot {
  return Object.freeze({
    nodes: Object.freeze(store.getSnapshots()),
    revision: store.revision,
    selectionDispatch: Object.freeze({ ...store.getSelectionDispatchMetrics() })
  });
}

export function resolveIdFactory(value?: () => string): () => string {
  return value ?? defaultId;
}

export function resolveNow(value?: () => string): () => string {
  return value ?? (() => new Date().toISOString());
}

export function runtimeSource(source: string | undefined, documentId: string): string {
  return source ?? `urn:unifold:runtime:${documentId}`;
}

function valueOrCreate(value: string | undefined, create: () => string): string {
  return value ?? create();
}

function valueOrDefault(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function defaultId(): string {
  return globalThis.crypto.randomUUID();
}

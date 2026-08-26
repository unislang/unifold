import {
  UiCommandType,
  UiTransactionStatus,
  type UiCommand,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiTransactionMetadata,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type { UiCompositionInstanceManifest } from "@unislang/unifold-contracts";
import { withValidatedControl, type UiValidatorRegistryPort } from "@unislang/unifold-forms";
import type { AggregateControlValidator, NormalizedNodeStore } from "@unislang/unifold-reactivity";

import type {
  UiRuntimeInspectionSnapshot,
  UiRuntimeStoreBinding,
  UnifoldRuntimeOptions
} from "./types.js";

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

export function commandNodeId(command: UiCommand): UiNodeId | undefined {
  if ("id" in command) return command.id;
  if (command.type === UiCommandType.StructureInstantiate) return command.node.id;
  return undefined;
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
  return transactionRetention === undefined
    ? { aggregateValidator }
    : { aggregateValidator, transactionRetention };
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

export function valueOrCreate(value: string | undefined, create: () => string): string {
  return value ?? create();
}

export function valueOrDefault(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function defaultId(): string {
  return globalThis.crypto.randomUUID();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown effect error";
}

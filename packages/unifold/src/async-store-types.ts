import type { DataClassification, JsonValue, UiStoreDefinition } from "@unislang/unifold-contracts";

export type UiAsyncStoreOperation = "commit" | "load" | "subscribe";
export type UiAsyncStoreCommitStatus =
  | "cancelled"
  | "committed"
  | "conflict"
  | "denied"
  | "invalid"
  | "unavailable";
export type UiAsyncStoreConnectionStatus =
  | "cancelled"
  | "connected"
  | "denied"
  | "invalid"
  | "unavailable";
export type UiAsyncStoreEventStatus = "conflict" | "rejected" | "updated";
export type UiStoreExternalConflictPolicy = "external-wins" | "reject-concurrent";

export interface UiAsyncStoreSnapshot {
  readonly dataVersion: string;
  readonly revision: string;
  readonly value: JsonValue;
}

export interface UiAsyncStoreCommitCommand {
  readonly expectedRevision: string;
  readonly idempotencyKey: string;
  readonly path: string;
  readonly signal?: AbortSignal;
  readonly value: JsonValue;
}

export interface UiAsyncStoreAdapterCommitCommand extends UiAsyncStoreCommitCommand {
  readonly candidate: JsonValue;
  readonly dataVersion: string;
}

export interface UiAsyncStoreCommitResult {
  readonly code?: string;
  readonly snapshot?: UiAsyncStoreSnapshot;
  readonly status: UiAsyncStoreCommitStatus;
}

export interface UiAsyncStoreAdapter {
  readonly version: string;
  commit(command: UiAsyncStoreAdapterCommitCommand): Promise<UiAsyncStoreCommitResult>;
  load(signal?: AbortSignal): Promise<UiAsyncStoreSnapshot | undefined>;
  subscribe?(listener: (snapshot: UiAsyncStoreSnapshot) => void): () => void;
}

export interface UiStoreDataMigration {
  readonly fromVersion: string;
  readonly migrate: (value: JsonValue) => JsonValue;
  readonly toVersion: string;
}

export interface UiStoreSinkAuthorizationRequest {
  readonly classification: DataClassification;
  readonly operation: UiAsyncStoreOperation;
  readonly path?: string;
  readonly storeId: string;
}

export interface UiStoreSinkAuthorizationPort {
  decide(request: UiStoreSinkAuthorizationRequest): Promise<boolean>;
}

export interface UiAsyncStoreEvent {
  readonly code?: string;
  readonly snapshot?: UiAsyncStoreSnapshot;
  readonly status: UiAsyncStoreEventStatus;
}

export interface UiAsyncStoreSession {
  readonly definition: UiStoreDefinition;
  readonly snapshot: UiAsyncStoreSnapshot | undefined;
  commit(command: UiAsyncStoreCommitCommand): Promise<UiAsyncStoreCommitResult>;
  dispose(): void;
  subscribe(listener: (event: UiAsyncStoreEvent) => void): () => void;
}

export interface UiAsyncStoreConnectionOptions {
  readonly authorization: UiStoreSinkAuthorizationPort;
  readonly conflictPolicy?: UiStoreExternalConflictPolicy;
  readonly migrations?: readonly UiStoreDataMigration[];
  readonly signal?: AbortSignal;
}

export interface UiAsyncStoreConnectionResult {
  readonly code?: string;
  readonly session?: UiAsyncStoreSession;
  readonly status: UiAsyncStoreConnectionStatus;
}

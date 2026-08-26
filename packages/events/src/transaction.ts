import type { UiNodeId } from "./node.js";
import { UiTransactionStatus } from "./enums.js";

export interface UiTransactionRecord {
  readonly id: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly previousRevision: number;
  readonly revision: number;
  readonly changedNodeIds: readonly UiNodeId[];
  readonly changedPaths: readonly string[];
  readonly status: UiTransactionStatus;
  readonly timestamp: string;
}

export interface UiTransactionMetadata {
  readonly id: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly timestamp: string;
}

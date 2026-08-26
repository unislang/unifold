import type { NormalizedParityNode } from "./normalize.js";

export enum ParityPreparationStatus {
  Prepared = "prepared",
  Rejected = "rejected"
}

export interface ParityCaseResult {
  readonly diagnostics: readonly { readonly code: string; readonly path: string }[];
  readonly expected: readonly NormalizedParityNode[];
  readonly ir?: readonly NormalizedParityNode[];
  readonly initialEventCount: number;
  readonly profileDiagnostics: readonly {
    readonly code: string;
    readonly feature?: string;
    readonly path: string;
  }[];
  readonly status: ParityPreparationStatus;
}

export interface NormalizedCanonicalEvent {
  readonly causationId?: string;
  readonly commandType?: string;
  readonly correlationId: string;
  readonly disclosureMode?: string;
  readonly hasSnapshot: boolean;
  readonly id: string;
  readonly phase: string;
  readonly redactionReason?: string;
  readonly sequence: number;
  readonly source: string;
  readonly sourceNodeId?: string;
  readonly stateRevision: number;
  readonly transactionId: string;
  readonly type: string;
}

export interface BehaviorParityResult {
  readonly canonicalEvents: readonly NormalizedCanonicalEvent[];
  readonly unifoldStoreValue: string;
}

interface JsonUiParityResults {
  readonly behavior?: BehaviorParityResult;
  readonly cases: Readonly<Record<string, ParityCaseResult>>;
}

declare global {
  interface Window {
    __jsonUiParity: JsonUiParityResults;
  }
}

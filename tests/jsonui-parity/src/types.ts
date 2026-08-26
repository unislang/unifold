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

interface JsonUiParityResults {
  readonly cases: Readonly<Record<string, ParityCaseResult>>;
}

declare global {
  interface Window {
    __jsonUiParity: JsonUiParityResults;
  }
}

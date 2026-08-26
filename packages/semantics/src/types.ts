import type { JsonValue, UiCompositionInstanceManifest } from "@unislang/unifold-contracts";
import type { UiNodeSnapshot } from "@unislang/unifold-events";

import type {
  SemanticCompilationStatus,
  SemanticDiagnosticCode,
  SemanticDiagnosticSeverity
} from "./enums.js";

export type {
  SemanticCompositionExportControlBinding,
  SemanticConstant,
  SemanticEntity,
  SemanticEntityReference,
  SemanticGraph,
  SemanticList,
  SemanticNodeControlBinding,
  SemanticPropertyValue,
  SemanticPublication,
  SemanticVocabulary
} from "@unislang/unifold-contracts";

export interface SemanticDiagnostic {
  readonly code: SemanticDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly severity: SemanticDiagnosticSeverity;
}

export interface SemanticCompilationResult {
  readonly diagnostics: readonly SemanticDiagnostic[];
  readonly jsonLd?: Readonly<Record<string, JsonValue>>;
  readonly serialized?: string;
  readonly status: SemanticCompilationStatus;
}

export type SemanticSnapshotSource = Readonly<Record<string, UiNodeSnapshot>>;

export interface SemanticCompilationSource {
  readonly compositionsByInstanceId: Readonly<Record<string, UiCompositionInstanceManifest>>;
  readonly snapshots: SemanticSnapshotSource;
}

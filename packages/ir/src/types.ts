import type {
  JsonObject,
  UiCompositionInstanceManifest,
  UiCompositionNodeProvenance,
  UiMachineDefinition,
  UiNodeEventBindings,
  UiDerivedRuleDefinition,
  UiStoreBinding,
  UiStoreDefinition,
  UiNodeKind,
  JsonUiUpstreamRevision,
  UiSchemaVersion,
  SemanticGraph
} from "@unislang/unifold-contracts";

import type {
  CompilationStatus,
  DiagnosticCode,
  DiagnosticSeverity,
  UnifoldIrVersion
} from "./enums.js";

export interface CompilerDiagnostic {
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly nodeId?: string;
  readonly path: string;
  readonly severity: DiagnosticSeverity;
}

export interface UnifoldIrSource {
  readonly documentSchemaVersion: UiSchemaVersion;
  readonly jsonUiProfile: string;
  readonly jsonUiUpstreamRevision: JsonUiUpstreamRevision;
}

export interface UnifoldIrNode {
  readonly childIds: readonly string[];
  readonly componentType: string;
  readonly composition?: UiCompositionNodeProvenance;
  readonly eventBindings: UiNodeEventBindings;
  readonly id: string;
  readonly binding?: UiStoreBinding;
  readonly kind: UiNodeKind;
  readonly controlChildIds?: readonly string[];
  readonly controlKey?: string;
  readonly controlParentId?: string;
  readonly parentId?: string;
  readonly properties: JsonObject;
  readonly scopePath: readonly string[];
}

export interface UnifoldIrDocument {
  readonly compositionsByInstanceId: Readonly<Record<string, UiCompositionInstanceManifest>>;
  readonly documentId: string;
  readonly documentRevision: string;
  readonly irVersion: UnifoldIrVersion;
  readonly machines: readonly UiMachineDefinition[];
  readonly nodeIdentityAliases: Readonly<Record<string, string>>;
  readonly nodesById: Readonly<Record<string, UnifoldIrNode>>;
  readonly renderOrder: readonly string[];
  readonly rules: readonly UiDerivedRuleDefinition[];
  readonly rootNodeId: string;
  readonly semantics?: SemanticGraph;
  readonly source: UnifoldIrSource;
  readonly sourcePointersByNodeId: Readonly<Record<string, string>>;
  readonly storesById: Readonly<Record<string, UiStoreDefinition>>;
}

export interface CompileResult {
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly document?: UnifoldIrDocument;
  readonly status: CompilationStatus;
}

export interface CompileUiDocumentOptions {
  readonly sourcePointersByNodeId?: Readonly<Record<string, string>>;
}

import type {
  JsonObject,
  JsonUiNode,
  JsonValue,
  UiCompositionExportDefinition,
  UiCompositionManifest
} from "@unislang/unifold-contracts";

import type {
  CompositionContractVersion,
  CompositionDiagnosticCode,
  CompositionExpansionStatus,
  CompositionParameterType
} from "./enums.js";

export interface CompositionParameterDefinition extends JsonObject {
  readonly default?: JsonValue;
  readonly required: boolean;
  readonly type: CompositionParameterType;
}

export interface CompositionSlotDefinition extends JsonObject {
  readonly multiple: boolean;
  readonly name: string;
  readonly required: boolean;
}

export interface CompositionDefinition extends JsonObject {
  readonly contractVersion: CompositionContractVersion;
  readonly exports: Readonly<Record<string, UiCompositionExportDefinition>>;
  readonly name: string;
  readonly parameters: Readonly<Record<string, CompositionParameterDefinition>>;
  readonly slots: readonly CompositionSlotDefinition[];
  readonly template: JsonObject;
  readonly version: string;
}

export interface CompositionInstance extends JsonObject {
  readonly $compose: string;
  readonly $version: string;
  readonly id: string;
  readonly parameters?: JsonObject;
  readonly slots?: Readonly<Record<string, readonly JsonObject[]>>;
}

export interface ComposedUiDocument extends JsonObject {
  readonly compositions: readonly CompositionDefinition[];
  readonly view: JsonObject;
}

export interface CompositionDiagnostic {
  readonly code: CompositionDiagnosticCode;
  readonly message: string;
  readonly path: string;
}

export interface CompositionExpansionResult {
  readonly diagnostics: readonly CompositionDiagnostic[];
  readonly document?: JsonObject & { readonly view: JsonUiNode };
  readonly exportsByInstanceId: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly manifest?: UiCompositionManifest;
  readonly status: CompositionExpansionStatus;
}

export interface CompositionExpansionOptions {
  readonly maxDepth?: number;
}

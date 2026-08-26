import type {
  JsonObject,
  UiCompositionInstanceManifest,
  UiCompositionNodeProvenance
} from "@unislang/unifold-contracts";

import type { CompositionRegistry } from "./registry.js";
import type { CompositionDiagnostic, CompositionSlotDefinition } from "./types.js";

export interface CompositionSlotContext {
  readonly definitions: ReadonlyMap<string, CompositionSlotDefinition>;
  readonly uses: Map<string, number>;
  readonly values: Readonly<Record<string, readonly JsonObject[]>>;
}

export interface ExpansionContext {
  readonly definitionSourcePointers: ReadonlyMap<string, string>;
  readonly diagnostics: CompositionDiagnostic[];
  readonly emittedNodeIds: Set<string>;
  readonly exportsByInstanceId: Record<string, Readonly<Record<string, string>>>;
  readonly identityAliases: Record<string, string>;
  readonly instances: UiCompositionInstanceManifest[];
  readonly maxDepth: number;
  readonly nodeProvenanceById: Record<string, UiCompositionNodeProvenance>;
  readonly registry: CompositionRegistry;
}

export interface CompositionOwnerContext {
  readonly ancestry: readonly string[];
  readonly definitionName: string;
  readonly definitionSourcePointer: string;
  readonly definitionVersion: string;
  readonly instanceId: string;
  readonly instanceSourcePointer: string;
  readonly slotName?: string;
  readonly slotSourcePointer?: string;
}

export interface ExpansionScope {
  readonly localIds?: Map<string, string>;
  readonly legacyCompatible?: boolean;
  readonly owner?: CompositionOwnerContext;
  readonly prefix?: string;
  readonly rootId?: string;
  readonly slots?: CompositionSlotContext;
}

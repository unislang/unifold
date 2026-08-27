import type {
  JsonObject,
  UiCompositionInstanceManifest,
  UiCompositionNodeProvenance,
  UiControlNodeDefinition
} from "@unislang/unifold-contracts";

import type { CompositionRegistry } from "./registry.js";
import type {
  CompositionControlMount,
  CompositionDefinition,
  CompositionDiagnostic,
  CompositionSlotDefinition
} from "./types.js";

export interface PendingControlTopology {
  readonly callerLocalIds: ReadonlyMap<string, string> | undefined;
  readonly definition: CompositionDefinition;
  readonly definitionPath: string;
  readonly instancePath: string;
  readonly localIds: ReadonlyMap<string, string>;
  readonly mount: CompositionControlMount | undefined;
}

export interface CompositionSlotContext {
  readonly definitions: ReadonlyMap<string, CompositionSlotDefinition>;
  readonly uses: Map<string, number>;
  readonly values: Readonly<Record<string, readonly JsonObject[]>>;
}

export interface ExpansionContext {
  readonly controlNodeIds: Set<string>;
  readonly controlNodeKinds: Map<string, UiControlNodeDefinition["kind"]>;
  readonly controlNodes: UiControlNodeDefinition[];
  readonly definitionSourcePointers: ReadonlyMap<string, string>;
  readonly diagnostics: CompositionDiagnostic[];
  readonly emittedNodeIds: Set<string>;
  readonly exportsByInstanceId: Record<string, Readonly<Record<string, string>>>;
  readonly identityAliases: Record<string, string>;
  readonly instances: UiCompositionInstanceManifest[];
  readonly maxDepth: number;
  readonly nodeProvenanceById: Record<string, UiCompositionNodeProvenance>;
  readonly pendingControlTopologies: PendingControlTopology[];
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
  readonly controlAttachmentIds?: ReadonlyMap<string, string>;
  readonly localIds?: Map<string, string>;
  readonly legacyCompatible?: boolean;
  readonly owner?: CompositionOwnerContext;
  readonly prefix?: string;
  readonly rootId?: string;
  readonly slots?: CompositionSlotContext;
}

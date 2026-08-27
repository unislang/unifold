import type { JsonObject } from "./json.js";
import type { UiCompositionManifest } from "./composition.js";
import type { UiMachineDefinition } from "./machine.js";
import type { SemanticGraph } from "./semantic.js";
import type { UiStoreDefinition } from "./store.js";
import type { UiDerivedRuleDefinition } from "./derived-rule.js";
import type { UiControlTopologyDefinition } from "./control.js";
import type { UiCollectionBehaviorDefinition } from "./collection-behavior.js";

export enum UiContractSchemaUri {
  Version1 = "https://schemas.unifold.org/ui-document/1.0/schema.json"
}

export enum UiSchemaVersion {
  Version1 = "1.0.0"
}

export enum JsonUiProfileName {
  Unifold = "unifold-jsonui"
}

export enum JsonUiProfileVersion {
  Version1 = "1.0.0"
}

export enum JsonUiUpstreamRevision {
  Version01025 = "5401b3d4900ca3032c108d6db00e8a819f4b28e9"
}

export enum CoreCatalogMajor {
  Version1 = "1"
}

export enum CoreCatalogName {
  UnifoldCore = "unifold-core"
}

export enum CoreCatalogVersion {
  Version1 = "1.0.0"
}

/** Declarative component signals that may be routed to a workflow event. */
export enum UiComponentEventBinding {
  Activated = "activated",
  Blurred = "blurred",
  Input = "input",
  ResetRequested = "reset-requested",
  SubmitRequested = "submit-requested",
  Submitted = "submitted"
}

export type UiNodeEventBindings = Readonly<Partial<Record<UiComponentEventBinding, string>>>;

export interface JsonUiProfile extends JsonObject {
  readonly name: JsonUiProfileName;
  readonly upstream: JsonUiUpstreamRevision;
  readonly version: JsonUiProfileVersion;
}

export interface ComponentCatalogReference extends JsonObject {
  readonly name: CoreCatalogName;
  readonly version: CoreCatalogVersion;
}

/** JsonUI-shaped node. Catalog-declared properties remain JSON data. */
export interface JsonUiNode extends JsonObject {
  readonly $children?: readonly JsonUiNode[];
  readonly $comp: string;
  readonly events?: UiNodeEventBindings;
  readonly id: string;
  readonly path?: string;
  readonly store?: string;
}

/** Minimal public contract implemented by the first vertical slice. */
export interface UiDocument extends JsonObject {
  readonly $schema: UiContractSchemaUri;
  readonly catalog: ComponentCatalogReference;
  readonly compositionManifest?: UiCompositionManifest;
  readonly collectionBehaviors?: UiCollectionBehaviorDefinition;
  readonly controls?: UiControlTopologyDefinition;
  readonly id: string;
  readonly jsonUiProfile: JsonUiProfile;
  readonly machines?: readonly UiMachineDefinition[];
  readonly revision: string;
  readonly rules?: readonly UiDerivedRuleDefinition[];
  readonly schemaVersion: UiSchemaVersion;
  readonly semantics?: SemanticGraph;
  readonly stores?: readonly UiStoreDefinition[];
  readonly view: JsonUiNode;
}

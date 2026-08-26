import type { JsonObject, JsonPrimitive } from "./json.js";

export enum SemanticContractVersion {
  Version1 = "1.0.0"
}

export enum SchemaOrgRelease {
  Version30 = "30.0"
}

export enum SchemaOrgVocabularyUri {
  Canonical = "https://schema.org"
}

export enum SemanticPublicationMode {
  PublicPage = "public-page"
}

export enum SemanticPublicationProfile {
  SchemaOrg = "schema.org"
}

export enum SemanticValueKind {
  Constant = "constant",
  CompositionExportControlValue = "composition-export-control-value",
  EntityReference = "entity-reference",
  List = "list",
  NodeControlValue = "node-control-value"
}

export interface SemanticVocabulary extends JsonObject {
  readonly release: SchemaOrgRelease;
  readonly uri: SchemaOrgVocabularyUri;
}

export interface SemanticPublication extends JsonObject {
  readonly mode: SemanticPublicationMode;
  readonly profile: SemanticPublicationProfile;
}

export interface SemanticConstant extends JsonObject {
  readonly kind: SemanticValueKind.Constant;
  readonly value: JsonPrimitive;
}

export interface SemanticEntityReference extends JsonObject {
  readonly entityId: string;
  readonly kind: SemanticValueKind.EntityReference;
}

export interface SemanticNodeControlBinding extends JsonObject {
  readonly kind: SemanticValueKind.NodeControlValue;
  readonly nodeId: string;
}

export interface SemanticCompositionExportControlBinding extends JsonObject {
  readonly exportName: string;
  readonly instanceId: string;
  readonly kind: SemanticValueKind.CompositionExportControlValue;
}

export interface SemanticList extends JsonObject {
  readonly items: readonly SemanticPropertyValue[];
  readonly kind: SemanticValueKind.List;
}

export type SemanticPropertyValue =
  | SemanticConstant
  | SemanticCompositionExportControlBinding
  | SemanticEntityReference
  | SemanticList
  | SemanticNodeControlBinding;

export interface SemanticEntity extends JsonObject {
  readonly id: string;
  readonly properties: Readonly<Record<string, SemanticPropertyValue>>;
  readonly type: string;
}

export interface SemanticGraph extends JsonObject {
  readonly contractVersion: SemanticContractVersion;
  readonly entities: readonly SemanticEntity[];
  readonly primaryEntity?: string;
  readonly publication: SemanticPublication;
  readonly vocabulary: SemanticVocabulary;
}

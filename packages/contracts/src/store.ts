import type { JsonObject } from "./json.js";

export enum DataClassification {
  Public = "public",
  Internal = "internal",
  Confidential = "confidential",
  Restricted = "restricted",
  NeverExport = "never-export"
}

export const DATA_CLASSIFICATION_ORDER: readonly DataClassification[] = Object.freeze([
  DataClassification.Public,
  DataClassification.Internal,
  DataClassification.Confidential,
  DataClassification.Restricted,
  DataClassification.NeverExport
]);

const dataClassificationRanks: Readonly<Record<DataClassification, number>> = Object.freeze({
  [DataClassification.Public]: 0,
  [DataClassification.Internal]: 1,
  [DataClassification.Confidential]: 2,
  [DataClassification.Restricted]: 3,
  [DataClassification.NeverExport]: 4
});

export function maximumDataClassification(
  values: readonly DataClassification[]
): DataClassification {
  return values.reduce(moreRestrictiveClassification, DataClassification.Public);
}

function moreRestrictiveClassification(
  current: DataClassification,
  candidate: DataClassification
): DataClassification {
  return dataClassificationRanks[current] >= dataClassificationRanks[candidate]
    ? current
    : candidate;
}

export enum UiStoreAccess {
  ReadOnly = "read-only",
  ReadWriteDraft = "read-write-draft"
}

export enum UiStoreInitialDataPolicy {
  Forbidden = "forbidden",
  Optional = "optional",
  Required = "required"
}

export enum UiStoreOwnership {
  Host = "host",
  RemoteQuery = "remote-query",
  Runtime = "runtime"
}

export enum UiStorePersistence {
  Local = "local",
  Memory = "memory",
  Remote = "remote",
  Session = "session"
}

export enum UiStoreSchemaVersion {
  Version1 = "1.0.0"
}

export enum UiStoreSourceKind {
  Host = "host",
  Local = "local",
  Query = "query",
  Route = "route"
}

export interface UiStoreMigrationRange extends JsonObject {
  readonly maximum: string;
  readonly minimum: string;
}

export interface UiStoreSource extends JsonObject {
  readonly kind: UiStoreSourceKind;
}

export interface UiStoreDefinition extends JsonObject {
  readonly access: UiStoreAccess;
  readonly classification: DataClassification;
  readonly id: string;
  readonly initialData: UiStoreInitialDataPolicy;
  readonly maxBytes: number;
  readonly migrations: UiStoreMigrationRange;
  readonly ownership: UiStoreOwnership;
  readonly persistence: UiStorePersistence;
  readonly schema: JsonObject;
  readonly schemaVersion: UiStoreSchemaVersion;
  readonly source: UiStoreSource;
}

export interface UiStoreBinding extends JsonObject {
  readonly path: string;
  readonly store: string;
}

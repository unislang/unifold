import type {
  UnifoldApplicationUpdateResult,
  UnifoldApplicationMountStatus
} from "@unislang/unifold";

export interface PrototypeWindow {
  __unifoldAuthoredDocument?: unknown;
  __unifoldCapturedEvents?: import("@unislang/unifold-events").UiEvent[];
  __unifoldDefineElements?: typeof import("@unislang/unifold").defineUnifoldElements;
  __unifoldMigrateProfile?: (mode: ProfileMigrationMode) => UnifoldApplicationUpdateResult;
  __unifoldMountRealmCopy?: () => RealmCopyResult;
  __unifoldBeginStateAuthorityTrace?: () => void;
  __unifoldReadStateAuthorityTrace?: () => import("./reference-state-authority.js").ReferenceStateAuthorityObservation;
  __unifoldUpdateDocument?: (source: unknown) => UnifoldApplicationUpdateResult;
}

export type ProfileMigrationMode = "preserve" | "reset" | "unreviewed";

export interface ProfileDocument {
  readonly compositions: [ProfileDefinition];
  revision: string;
  readonly semantics: {
    readonly entities: [{ readonly properties: { readonly name: { exportName: string } } }];
  };
  readonly view: { $version: string };
}

export interface ProfileDefinition {
  readonly exports: Record<string, ProfileExport>;
  readonly template: { readonly $children: [{ readonly $children: ProfileField[] }] };
  version: string;
}

export interface ProfileExport {
  localId: string;
  readonly [property: string]: unknown;
}

interface ProfileField {
  id: string;
  label: unknown;
  value: unknown;
}

export interface RealmCopyResult {
  readonly childCount: number;
  readonly status: UnifoldApplicationMountStatus;
}

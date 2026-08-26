import type { JsonObject } from "./json.js";

export enum UiCompositionExportKind {
  Command = "command",
  Event = "event",
  Selection = "selection"
}

export enum UiCompositionManifestVersion {
  Version1 = "1.0.0"
}

export enum UiCompositionSelectionKind {
  ControlValue = "control-value",
  Properties = "properties",
  Snapshot = "snapshot"
}

export interface UiCompositionSelectionExport extends JsonObject {
  readonly kind: UiCompositionExportKind.Selection;
  readonly localId: string;
  readonly selection: UiCompositionSelectionKind;
}

export interface UiCompositionEventExport extends JsonObject {
  readonly eventType?: string;
  readonly kind: UiCompositionExportKind.Event;
  readonly localId: string;
}

export interface UiCompositionCommandExport extends JsonObject {
  readonly commandType: string;
  readonly kind: UiCompositionExportKind.Command;
  readonly localId: string;
}

export type UiCompositionExportDefinition =
  | UiCompositionCommandExport
  | UiCompositionEventExport
  | UiCompositionSelectionExport;

export type UiResolvedCompositionExport = UiCompositionExportDefinition & {
  readonly nodeId: string;
};

export interface UiCompositionNodeProvenance extends JsonObject {
  readonly ancestry: readonly string[];
  readonly definitionName: string;
  readonly definitionSourcePointer?: string;
  readonly definitionVersion: string;
  readonly instanceId: string;
  readonly instanceSourcePointer: string;
  readonly localId: string;
  readonly slotName?: string;
  readonly slotSourcePointer?: string;
}

export interface UiCompositionInstanceManifest extends JsonObject {
  readonly ancestry: readonly string[];
  readonly definitionName: string;
  readonly definitionSourcePointer: string;
  readonly definitionVersion: string;
  readonly exports: Readonly<Record<string, UiResolvedCompositionExport>>;
  readonly instanceId: string;
  readonly instanceSourcePointer: string;
  readonly rootNodeId: string;
}

export interface UiCompositionManifest extends JsonObject {
  readonly contractVersion: UiCompositionManifestVersion;
  readonly instances: readonly UiCompositionInstanceManifest[];
  readonly nodeProvenanceById: Readonly<Record<string, UiCompositionNodeProvenance>>;
}

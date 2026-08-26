import type { JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { TrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";
import type { DomRenderController, DomRendererOptions } from "@unislang/unifold-renderer-dom";
import type { UnifoldRuntime, UnifoldRuntimeOptions } from "@unislang/unifold-runtime";
import type { UiMachineCommandRegistry } from "@unislang/unifold-xstate";
import type { UiMachineGuardRegistry } from "@unislang/unifold-xstate";
import type { UiCompositionVersionMigration } from "./composition-migrations.js";

export enum UnifoldApplicationDiagnosticStage {
  Compilation = "compilation",
  Composition = "composition",
  Coordination = "coordination",
  DocumentLoading = "document-loading",
  ElementRegistration = "element-registration",
  Renderer = "renderer",
  Runtime = "runtime",
  Semantics = "semantics",
  Store = "store",
  Workflow = "workflow"
}

export enum UnifoldApplicationMountStatus {
  Mounted = "mounted",
  Rejected = "rejected"
}

export enum UnifoldApplicationMountMode {
  Replace = "replace",
  UpgradeStatic = "upgrade-static"
}

export enum UnifoldApplicationUpdateStatus {
  Applied = "applied",
  Rejected = "rejected"
}

export enum UnifoldPreparationStatus {
  Invalid = "invalid",
  Valid = "valid"
}

export enum UnifoldSemanticPublicationMode {
  Automatic = "automatic",
  Disabled = "disabled"
}

export interface UnifoldApplicationDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly stage: UnifoldApplicationDiagnosticStage;
}

export interface PreparedUnifoldDocument {
  readonly authored: unknown;
  readonly document: UnifoldIrDocument;
}

export interface UnifoldPreparationResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly prepared?: PreparedUnifoldDocument;
  readonly status: UnifoldPreparationStatus;
}

export interface UnifoldPreparationOptions {
  readonly layoutRegistry?: TrustedLayoutDefinitionRegistry;
}

export type CoordinatedRuntimeOptions = Omit<
  UnifoldRuntimeOptions,
  "compositionInstances" | "documentId" | "initialNodes" | "storeBindings"
>;

export interface MountUnifoldApplicationOptions extends UnifoldPreparationOptions {
  readonly compositionMigrations?: readonly UiCompositionVersionMigration[];
  readonly machineCommands?: UiMachineCommandRegistry;
  readonly machineGuards?: UiMachineGuardRegistry;
  readonly mountMode?: UnifoldApplicationMountMode;
  readonly renderer?: DomRendererOptions;
  readonly runtime?: CoordinatedRuntimeOptions;
  readonly semanticPublication?: UnifoldSemanticPublicationMode;
  readonly storeAdapters?: UiStoreAdapterRegistry;
}

export interface UiStoreAdapter {
  readonly version: string;
  load(): JsonValue | undefined;
  write?(path: string, value: JsonValue): void;
}

export type UiStoreAdapterRegistry = Readonly<Record<string, UiStoreAdapter>>;

export interface MountedUnifoldApplicationResult {
  readonly application: UnifoldApplicationPort;
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly status: UnifoldApplicationMountStatus.Mounted;
}

export interface RejectedUnifoldApplicationResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly status: UnifoldApplicationMountStatus.Rejected;
}

export type MountUnifoldApplicationResult =
  | MountedUnifoldApplicationResult
  | RejectedUnifoldApplicationResult;

export interface UnifoldApplicationUpdateResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly revision: number;
  readonly status: UnifoldApplicationUpdateStatus;
}

export interface UnifoldApplicationPort {
  readonly authored: unknown;
  readonly document: UnifoldIrDocument;
  readonly renderer: DomRenderController;
  readonly runtime: UnifoldRuntime;
  dispose(): void;
  machineState(id: string): JsonValue;
  update(authored: unknown): UnifoldApplicationUpdateResult;
}

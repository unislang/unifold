import type { JsonValue } from "@unislang/unifold-contracts";
import type {
  AnnouncementRequestCommand,
  ControlMarkTouchedCommand,
  ControlSetDisabledCommand,
  ControlSetValueCommand,
  EffectInvokeCommand,
  FocusRequestCommand,
  FormResetCommand,
  FormSubmitCommand,
  NavigationRequestCommand,
  NodePatchPropertiesCommand,
  UiTransactionRecord
} from "@unislang/unifold-events";
import type { ElementDefinitionPolicy } from "@unislang/unifold-elements";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type {
  LayoutCollectionDefinition,
  TrustedLayoutDefinitionRegistry
} from "@unislang/unifold-compositions";
import type { DomRenderController, DomRendererOptions } from "@unislang/unifold-renderer-dom";
import type {
  UiExecutionContext,
  UnifoldRuntime,
  UnifoldRuntimeOptions
} from "@unislang/unifold-runtime";
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
  readonly collectionsById: Readonly<Record<string, LayoutCollectionDefinition>>;
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
  readonly elementDefinitionPolicy?: ElementDefinitionPolicy;
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

export interface UiOriginatingExecutionContext {
  readonly causationId?: string;
  readonly correlationId?: string;
}

export type UnifoldApplicationCommand =
  | AnnouncementRequestCommand
  | ControlMarkTouchedCommand
  | ControlSetDisabledCommand
  | ControlSetValueCommand
  | EffectInvokeCommand
  | FocusRequestCommand
  | FormResetCommand
  | FormSubmitCommand
  | NavigationRequestCommand
  | NodePatchPropertiesCommand;

export interface UnifoldApplicationRuntimePort {
  readonly composition: UnifoldRuntime["composition"];
  readonly control: UnifoldRuntime["control"];
  readonly events$: UnifoldRuntime["events$"];
  readonly getSnapshot: UnifoldRuntime["getSnapshot"];
  readonly getTransaction: UnifoldRuntime["getTransaction"];
  readonly getValidationErrors: UnifoldRuntime["getValidationErrors"];
  readonly inspect: UnifoldRuntime["inspect"];
  readonly node: UnifoldRuntime["node"];
  readonly registerActor: UnifoldRuntime["registerActor"];
  readonly revision: number;
  readonly scope: UnifoldRuntime["scope"];
  readonly select: UnifoldRuntime["select"];
  readonly status: UnifoldRuntime["status"];
  execute(
    commands: readonly UnifoldApplicationCommand[],
    context?: UiExecutionContext
  ): UiTransactionRecord;
}

export interface UnifoldApplicationRendererPort {
  readonly getElement: DomRenderController["getElement"];
}

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
  readonly renderer: UnifoldApplicationRendererPort;
  readonly runtime: UnifoldApplicationRuntimePort;
  dispose(): void;
  machineState(id: string): JsonValue;
  applyCollectionOperation(
    operation: import("./authored-collection.js").UnifoldCollectionOperation,
    origin?: UiOriginatingExecutionContext
  ): UnifoldApplicationUpdateResult;
  update(authored: unknown): UnifoldApplicationUpdateResult;
}

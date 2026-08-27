import type {
  UiDerivedRuleDefinition,
  UiCompositionInstanceManifest,
  UiCompositionSelectionKind
} from "@unislang/unifold-contracts";
import type {
  UiCommand,
  UiEvent,
  UiNodeId,
  UiNodeSnapshot,
  UiValidationError,
  UiControlStatus,
  JsonValue,
  UiTransactionRecord
} from "@unislang/unifold-events";
import type { SelectionDispatchMetrics, UiSelection } from "@unislang/unifold-reactivity";
import type {
  UiAsyncValidatorRegistryPort,
  UiValidatorRegistryPort
} from "@unislang/unifold-forms";
import type { Observable } from "rxjs";
import type { UiActorRef } from "@unislang/unifold-xstate";

export enum UnifoldRuntimeStatus {
  Active = "active",
  Disposed = "disposed"
}

export interface UiExecutionContext {
  readonly causationId?: string;
  readonly correlationId?: string;
  readonly effectSourceId?: UiNodeId;
  readonly transactionId?: string;
}

export interface UiRuntimeExecutionContext extends UiExecutionContext {
  readonly suppressedStoreWriteIds?: readonly string[];
}

export interface UiResolvedExecutionContext {
  readonly causationId: string;
  readonly correlationId: string;
  readonly effectSourceId?: UiNodeId;
  readonly transactionId: string;
}

export interface UiResolvedRuntimeExecutionContext extends UiResolvedExecutionContext {
  readonly suppressedStoreWriteIds: readonly string[];
}

export interface UiEffectExecutionContext extends UiResolvedExecutionContext {
  readonly effectId: string;
}

export interface UiCommandPort {
  execute(command: UiCommand, context: UiEffectExecutionContext): Promise<void> | void;
}

export interface UnifoldRuntimeCoordination {
  execute(commands: readonly UiCommand[], context?: UiRuntimeExecutionContext): UiTransactionRecord;
  registerActor(id: UiNodeId, actor: UiActorRef): () => void;
  commit(): void;
  discard(): void;
}

export interface UiRuntimeInspectionSnapshot {
  readonly nodes: readonly UiNodeSnapshot[];
  readonly revision: number;
  readonly selectionDispatch: SelectionDispatchMetrics;
}

export interface UiRuntimeStoreBinding {
  readonly path: string;
  readonly storeId: string;
}

export interface RuntimeTransactionResult {
  readonly derivedCommands: readonly UiCommand[];
  readonly record: UiTransactionRecord;
}

export interface UnifoldRuntimeOptions {
  readonly asyncValidatorRegistry?: UiAsyncValidatorRegistryPort;
  readonly commandPort?: UiCommandPort;
  readonly compositionInstances?: Readonly<Record<string, UiCompositionInstanceManifest>>;
  readonly createId?: () => string;
  readonly documentId: string;
  readonly initialNodes?: readonly UiNodeSnapshot[];
  readonly now?: () => string;
  readonly rules?: readonly UiDerivedRuleDefinition[];
  readonly source?: string;
  readonly storeBindings?: Readonly<Record<UiNodeId, UiRuntimeStoreBinding>>;
  readonly transactionRetention?: number;
  readonly validatorRegistry?: UiValidatorRegistryPort;
}

export interface UiNodeHandle {
  readonly id: UiNodeId;
  readonly events$: Observable<UiEvent>;
  readonly snapshot: UiNodeSnapshot;
  select<T>(read: (snapshot: UiNodeSnapshot) => T): UiSelection<T>;
}

/** Typed facade over control facts selected from the runtime's single normalized store. */
export interface UiControlHandle<TValue extends JsonValue = JsonValue> extends UiNodeHandle {
  readonly errors: readonly UiValidationError[];
  readonly errors$: Observable<readonly UiValidationError[]>;
  readonly rawValue: TValue;
  readonly rawValue$: Observable<TValue>;
  readonly status: UiControlStatus;
  readonly status$: Observable<UiControlStatus>;
  readonly value: TValue;
  readonly value$: Observable<TValue>;
  dispose(): void;
  markTouched(): UiTransactionRecord;
  reset(): UiTransactionRecord;
  setDisabled(disabled: boolean): UiTransactionRecord;
  setValue(value: TValue): UiTransactionRecord;
}

export type UiScopeHandle = UiNodeHandle;

export interface UiCompositionCommandTarget {
  readonly commandType: string;
  readonly nodeId: UiNodeId;
}

export interface UiCompositionHandle extends UiNodeHandle {
  readonly definitionName: string;
  readonly definitionVersion: string;
  command(alias: string): UiCompositionCommandTarget;
  exportedEvents(alias: string): Observable<UiEvent>;
  selection(alias: string): UiSelection<unknown>;
  selectionKind(alias: string): UiCompositionSelectionKind;
}

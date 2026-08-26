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
  UiTransactionRecord
} from "@unislang/unifold-events";
import type { SelectionDispatchMetrics, UiSelection } from "@unislang/unifold-reactivity";
import type {
  UiAsyncValidatorRegistryPort,
  UiValidatorRegistryPort
} from "@unislang/unifold-forms";
import type { Observable } from "rxjs";

export enum UnifoldRuntimeStatus {
  Active = "active",
  Disposed = "disposed"
}

export interface UiExecutionContext {
  readonly causationId?: string;
  readonly correlationId?: string;
  readonly transactionId?: string;
}

export interface UiCommandPort {
  execute(command: UiCommand, context: Required<UiExecutionContext>): void;
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

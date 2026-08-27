import type {
  UiControlState,
  UiNodeId,
  UiNodeSnapshot,
  UiValidationError,
  UiTransactionMetadata,
  UiTransactionRecord
} from "@unislang/unifold-events";
import type { Draft } from "immer";
import type { Observable } from "rxjs";

export interface NormalizedNodeState {
  readonly revision: number;
  readonly nodes: Readonly<Record<UiNodeId, UiNodeSnapshot>>;
  readonly validationRoutes: Readonly<Record<UiNodeId, readonly UiValidationError[] | undefined>>;
  readonly children: Readonly<Record<UiNodeId, readonly UiNodeId[]>>;
  readonly controlChildren: Readonly<Record<UiNodeId, readonly UiNodeId[]>>;
}

export interface UiSelector<T> {
  readonly nodeIds?: readonly UiNodeId[];
  read(state: NormalizedNodeState): T;
}

export type Equality<T> = (previous: T, current: T) => boolean;
export type AggregateControlValidator = (node: UiNodeSnapshot) => UiControlState;
export type NodeRecipe = (node: Draft<UiNodeSnapshot>) => void;
export type Unsubscribe = () => void;

export interface UiSelection<T> {
  readonly changes$: Observable<T>;
  dispose(): void;
  get(): T;
  subscribe(listener: (value: T) => void): Unsubscribe;
}

export interface SelectionDispatchMetrics {
  readonly activeSelections: number;
  readonly candidateSelections: number;
  readonly changedNodeCount: number;
  readonly invalidatedSelections: number;
}

export interface UiNodeTransactionDraft {
  add(node: UiNodeSnapshot): void;
  controlDescendantIds(id: UiNodeId): readonly UiNodeId[];
  descendantIds(id: UiNodeId): readonly UiNodeId[];
  getSnapshot(id: UiNodeId): UiNodeSnapshot;
  reconcile(
    nodes: readonly UiNodeSnapshot[],
    identityAliases?: Readonly<Record<UiNodeId, UiNodeId>>,
    resetNodeIds?: readonly UiNodeId[]
  ): void;
  moveControl(parentId: UiNodeId, key: string, index: number): void;
  reconcileControlDisabled(
    rootIds: readonly UiNodeId[],
    validate?: AggregateControlValidator
  ): readonly UiNodeId[];
  remove(id: UiNodeId): void;
  removeControl(parentId: UiNodeId, key: string): void;
  update(id: UiNodeId, recipe: NodeRecipe): void;
}

export interface UiNodeStore {
  readonly revision: number;
  getSnapshot(id: UiNodeId): UiNodeSnapshot;
  getNodeIds(): readonly UiNodeId[];
  getSnapshots(): readonly UiNodeSnapshot[];
  getSelectionDispatchMetrics(): SelectionDispatchMetrics;
  getTransaction(revision: number): UiTransactionRecord | undefined;
  getValidationErrors(id: UiNodeId): readonly UiValidationError[];
  select<T>(selector: UiSelector<T>, equal?: Equality<T>): UiSelection<T>;
  transact(
    metadata: UiTransactionMetadata,
    change: (draft: UiNodeTransactionDraft) => void
  ): UiTransactionRecord;
  dispose(): void;
}

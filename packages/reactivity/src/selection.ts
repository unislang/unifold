import type { UiNodeId } from "@unislang/unifold-events";
import { Subject } from "rxjs";
import type { Equality, NormalizedNodeState, UiSelection, UiSelector } from "./store-types.js";

export class StoreSelection<T> implements UiSelection<T> {
  readonly changes$;
  private readonly changes = new Subject<T>();
  private current: T;
  private disposed = false;

  get nodeIds(): readonly UiNodeId[] | undefined {
    return this.selector.nodeIds;
  }

  constructor(
    private readonly selector: UiSelector<T>,
    state: NormalizedNodeState,
    private readonly equal: Equality<T>,
    private readonly onDispose: () => void
  ) {
    this.current = selector.read(state);
    this.changes$ = this.changes.asObservable();
  }

  get(): T {
    return this.current;
  }

  subscribe(listener: (value: T) => void): () => void {
    const subscription = this.changes$.subscribe(listener);
    return () => subscription.unsubscribe();
  }

  refresh(state: NormalizedNodeState, changedIds: Set<UiNodeId>): void {
    if (!this.shouldRefresh(changedIds)) return;
    const next = this.selector.read(state);
    if (this.equal(this.current, next)) return;
    this.current = next;
    this.changes.next(next);
  }

  disposeWhenInvalidated(invalidatedIds: ReadonlySet<UiNodeId>): boolean {
    const dependencies = this.selector.nodeIds;
    if (dependencies === undefined) return false;
    if (!dependencies.some((id) => invalidatedIds.has(id))) return false;
    this.dispose();
    return true;
  }

  private shouldRefresh(changedIds: Set<UiNodeId>): boolean {
    if (this.disposed) return false;
    return this.isCandidate(changedIds);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.changes.complete();
    this.onDispose();
  }

  private isCandidate(changedIds: Set<UiNodeId>): boolean {
    const dependencies = this.selector.nodeIds;
    return !dependencies || dependencies.some((id) => changedIds.has(id));
  }
}

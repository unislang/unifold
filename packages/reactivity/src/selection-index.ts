import type { UiNodeId } from "@unislang/unifold-events";

export interface SelectionIndexEntry {
  readonly nodeIds: readonly UiNodeId[] | undefined;
}

export class SelectionIndex<TSelection extends SelectionIndexEntry> {
  private readonly all = new Set<TSelection>();
  private readonly global = new Set<TSelection>();
  private readonly byNodeId = new Map<UiNodeId, Set<TSelection>>();

  get size(): number {
    return this.all.size;
  }

  add(selection: TSelection): void {
    this.all.add(selection);
    const nodeIds = selection.nodeIds;
    if (nodeIds === undefined) return void this.global.add(selection);
    nodeIds.forEach((id) => this.nodeSelections(id).add(selection));
  }

  candidates(nodeIds: ReadonlySet<UiNodeId>): ReadonlySet<TSelection> {
    const candidates = new Set(this.global);
    nodeIds.forEach((id) => this.byNodeId.get(id)?.forEach((item) => candidates.add(item)));
    return candidates;
  }

  delete(selection: TSelection): void {
    this.all.delete(selection);
    this.global.delete(selection);
    selection.nodeIds?.forEach((id) => this.deleteNodeSelection(id, selection));
  }

  values(): readonly TSelection[] {
    return [...this.all];
  }

  private nodeSelections(id: UiNodeId): Set<TSelection> {
    const existing = this.byNodeId.get(id);
    if (existing !== undefined) return existing;
    const created = new Set<TSelection>();
    this.byNodeId.set(id, created);
    return created;
  }

  private deleteNodeSelection(id: UiNodeId, selection: TSelection): void {
    const selections = this.byNodeId.get(id);
    if (selections === undefined) return;
    selections.delete(selection);
    if (selections.size === 0) this.byNodeId.delete(id);
  }
}

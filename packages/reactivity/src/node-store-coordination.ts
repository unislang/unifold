export enum NormalizedNodeStoreCoordinationStatus {
  Active = "active",
  Committed = "committed",
  Discarded = "discarded"
}

export interface NormalizedNodeStoreCoordination {
  readonly status: NormalizedNodeStoreCoordinationStatus;
  commit(): void;
  discard(): void;
}

export function createNodeStoreCoordination(
  commit: () => void,
  discard: () => void
): NormalizedNodeStoreCoordination {
  return new NodeStoreCoordination(commit, discard);
}

class NodeStoreCoordination implements NormalizedNodeStoreCoordination {
  status = NormalizedNodeStoreCoordinationStatus.Active;

  constructor(
    private readonly commitScope: () => void,
    private readonly discardScope: () => void
  ) {}

  commit(): void {
    this.settle(NormalizedNodeStoreCoordinationStatus.Committed, this.commitScope);
  }

  discard(): void {
    this.settle(NormalizedNodeStoreCoordinationStatus.Discarded, this.discardScope);
  }

  private settle(status: NormalizedNodeStoreCoordinationStatus, action: () => void): void {
    if (this.status !== NormalizedNodeStoreCoordinationStatus.Active) {
      throw new Error(`Node store coordination is already ${this.status}.`);
    }
    this.status = status;
    action();
  }
}

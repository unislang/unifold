import type { DataInvalidationBusPort, DataInvalidationMessage } from "./types.js";

export class MemoryDataInvalidationBus implements DataInvalidationBusPort {
  private readonly listeners = new Set<(message: DataInvalidationMessage) => void>();

  publish(message: DataInvalidationMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch {
        // One context cannot prevent other contexts from receiving an invalidation.
      }
    }
  }

  subscribe(listener: (message: DataInvalidationMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

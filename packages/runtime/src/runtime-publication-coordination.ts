import type { UiEvent } from "@unislang/unifold-events";

export interface RuntimePublisherCoordination {
  commit(): void;
  discard(): void;
}

interface PublicationState {
  readonly events: UiEvent[];
  readonly sequence: number;
}

export class RuntimePublicationBuffer {
  #state: PublicationState | undefined;

  begin(
    sequence: number,
    publish: (event: UiEvent) => void,
    restoreSequence: (sequence: number) => void
  ): RuntimePublisherCoordination {
    if (this.#state !== undefined) throw new Error("Runtime publication is coordinated.");
    const state: PublicationState = { events: [], sequence };
    this.#state = state;
    return {
      commit: () => this.commit(state, publish),
      discard: () => this.discard(state, restoreSequence)
    };
  }

  append(event: UiEvent): boolean {
    if (this.#state === undefined) return false;
    this.#state.events.push(event);
    return true;
  }

  private commit(state: PublicationState, publish: (event: UiEvent) => void): void {
    this.require(state);
    let cursor = 0;
    while (cursor < state.events.length) {
      const event = state.events[cursor];
      if (event === undefined) throw new Error("Runtime publication buffer is corrupt.");
      publish(event);
      cursor += 1;
    }
    this.#state = undefined;
  }

  private discard(state: PublicationState, restoreSequence: (sequence: number) => void): void {
    this.require(state);
    restoreSequence(state.sequence);
    this.#state = undefined;
  }

  private require(state: PublicationState): void {
    if (this.#state !== state) throw new Error("Runtime publication coordination is closed.");
  }
}

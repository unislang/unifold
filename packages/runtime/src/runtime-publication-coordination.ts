import type { UiEvent } from "@unislang/unifold-events";

export interface RuntimePublisherCoordination {
  commit(): void;
  discard(): void;
  prepare(): void;
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
      discard: () => this.discard(state, restoreSequence),
      prepare: () => this.prepare(state)
    };
  }

  append(event: UiEvent): boolean {
    if (this.#state === undefined) return false;
    this.#state.events.push(event);
    return true;
  }

  private commit(state: PublicationState, publish: (event: UiEvent) => void): void {
    this.prepare(state);
    let cursor = 0;
    while (cursor < state.events.length) {
      const event = state.events[cursor];
      if (event !== undefined) publishSafely(event, publish);
      cursor += 1;
    }
    this.#state = undefined;
  }

  private prepare(state: PublicationState): void {
    this.require(state);
    if (state.events.some((event) => event === undefined)) {
      throw new Error("Runtime publication buffer is corrupt.");
    }
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

function publishSafely(event: UiEvent, publish: (event: UiEvent) => void): void {
  try {
    publish(event);
  } catch {
    // A committed observer cannot reverse normalized state or interrupt sibling facts.
  }
}

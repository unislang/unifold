import type { UiEvent, UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";

const MAXIMUM_MACHINE_GUARDS = 256;

export interface UiMachineGuardContext {
  readonly event: UiEvent;
  readonly snapshot: (id: UiNodeId) => UiNodeSnapshot | undefined;
}

export type UiMachineGuardPredicate = (context: UiMachineGuardContext) => boolean;
export type UiMachineSnapshotReader = (id: UiNodeId) => UiNodeSnapshot | undefined;

/** Trusted synchronous predicates referenced by name from data-only machine definitions. */
export class UiMachineGuardRegistry {
  private readonly predicates = new Map<string, UiMachineGuardPredicate>();

  register(id: string, predicate: UiMachineGuardPredicate): () => void {
    if (this.predicates.has(id)) throw new Error(`Machine guard is already registered: ${id}.`);
    if (this.predicates.size >= MAXIMUM_MACHINE_GUARDS) {
      throw new RangeError(`Machine guards cannot exceed ${MAXIMUM_MACHINE_GUARDS}.`);
    }
    this.predicates.set(id, predicate);
    return () => this.predicates.delete(id);
  }

  evaluate(id: string, context: UiMachineGuardContext): boolean {
    const predicate = this.predicates.get(id);
    if (predicate === undefined) return false;
    try {
      return predicate(context) === true;
    } catch {
      return false;
    }
  }

  has(id: string): boolean {
    return this.predicates.has(id);
  }
}

export function createMachineGuardRegistry(): UiMachineGuardRegistry {
  return new UiMachineGuardRegistry();
}

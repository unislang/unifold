import type { UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import { createValidationActor, type UiValidationActor } from "@unislang/unifold-xstate";

export interface UiAsyncValidationResult {
  readonly errors: readonly UiValidationError[];
  readonly id: string;
  readonly requestId: string;
}

export interface UiAsyncValidationFailure {
  readonly error: unknown;
  readonly id: string;
  readonly requestId: string;
}

export interface UiAsyncValidationCallbacks {
  readonly complete: (result: UiAsyncValidationResult) => void;
  readonly fail: (failure: UiAsyncValidationFailure) => void;
}

interface ActiveValidation {
  readonly actor: UiValidationActor;
  readonly requestId: string;
}

export class UiAsyncValidationCoordinator {
  private readonly active = new Map<string, ActiveValidation>();

  constructor(
    private readonly registry: UiAsyncValidatorRegistryPort,
    private readonly callbacks: UiAsyncValidationCallbacks
  ) {}

  start(node: UiNodeSnapshot, requestId: string): void {
    this.cancel(node.id);
    const actor = createValidationActor(this.registry, node);
    this.active.set(node.id, { actor, requestId });
    actor.subscribe({
      next: (snapshot) => this.onSnapshot(node.id, requestId, snapshot),
      error: (error) => this.onError(node.id, requestId, error)
    });
    actor.start();
  }

  cancel(id: string): string | undefined {
    const current = this.active.get(id);
    if (current === undefined) return undefined;
    this.active.delete(id);
    current.actor.stop();
    return current.requestId;
  }

  dispose(): void {
    [...this.active.keys()].forEach((id) => this.cancel(id));
  }

  private onSnapshot(
    id: string,
    requestId: string,
    snapshot: ReturnType<UiValidationActor["getSnapshot"]>
  ): void {
    if (snapshot.status !== "done") return;
    this.complete(id, requestId, snapshot.output ?? []);
  }

  private complete(id: string, requestId: string, errors: readonly UiValidationError[]): void {
    if (!this.finish(id, requestId)) return;
    this.callbacks.complete({ errors, id, requestId });
  }

  private onError(id: string, requestId: string, error: unknown): void {
    if (!this.finish(id, requestId)) return;
    this.callbacks.fail({ error, id, requestId });
  }

  private finish(id: string, requestId: string): boolean {
    if (this.active.get(id)?.requestId !== requestId) return false;
    this.active.delete(id);
    return true;
  }
}

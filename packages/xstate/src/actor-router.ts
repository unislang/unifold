import type { UiEvent, UiNodeId } from "@unislang/unifold-events";

export interface UiXStateEvent {
  readonly type: string;
  readonly uiEvent: UiEvent;
}

export interface UiActorRef {
  send(event: UiXStateEvent): void;
}

export interface XStateEventRouterCheckpoint {
  commit(): void;
  discard(): void;
}

export class XStateEventRouter {
  private readonly owners = new Map<UiNodeId, Set<UiActorRef>>();

  checkpoint(): XStateEventRouterCheckpoint {
    const previous = copyOwners(this.owners);
    let active = true;
    return {
      commit: () => {
        active = false;
      },
      discard: () => {
        if (!active) throw new Error("Actor router checkpoint is closed.");
        restoreOwners(this.owners, previous);
        active = false;
      }
    };
  }

  register(id: UiNodeId, actor: UiActorRef): () => void {
    const actors = this.owners.get(id) ?? new Set<UiActorRef>();
    actors.add(actor);
    this.owners.set(id, actors);
    return () => this.unregister(id, actor);
  }

  route(event: UiEvent): void {
    const actors = this.resolveActors(event);
    const actorEvent = toXStateEvent(event);
    actors.forEach((actor) => this.sendSafely(actor, actorEvent));
  }

  clear(): void {
    this.owners.clear();
  }

  removeOwner(id: UiNodeId): void {
    this.owners.delete(id);
  }

  private unregister(id: UiNodeId, actor: UiActorRef): void {
    const actors = this.owners.get(id);
    if (!actors) return;
    actors.delete(actor);
    this.removeEmptyOwner(id, actors);
  }

  private sendSafely(actor: UiActorRef, event: UiXStateEvent): void {
    try {
      actor.send(event);
    } catch {
      // Actor adapters observe committed facts and cannot invalidate their publication.
    }
  }

  private removeEmptyOwner(id: UiNodeId, actors: Set<UiActorRef>): void {
    if (actors.size === 0) this.owners.delete(id);
  }

  private resolveActors(event: UiEvent): Set<UiActorRef> {
    const ids = event.data.sourceNode?.scopePath ?? [];
    const actors = new Set<UiActorRef>();
    ids.forEach((id) => this.owners.get(id)?.forEach((actor) => actors.add(actor)));
    return actors;
  }
}

function copyOwners(
  owners: ReadonlyMap<UiNodeId, ReadonlySet<UiActorRef>>
): Map<UiNodeId, Set<UiActorRef>> {
  return new Map([...owners].map(([id, actors]) => [id, new Set(actors)]));
}

function restoreOwners(
  owners: Map<UiNodeId, Set<UiActorRef>>,
  previous: ReadonlyMap<UiNodeId, ReadonlySet<UiActorRef>>
): void {
  owners.clear();
  previous.forEach((actors, id) => owners.set(id, new Set(actors)));
}

export function toXStateEvent(event: UiEvent): UiXStateEvent {
  return Object.freeze({ type: event.type, uiEvent: event });
}

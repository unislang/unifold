import type { UiEvent, UiNodeId } from "@unislang/unifold-events";

export interface UiXStateEvent {
  readonly type: string;
  readonly uiEvent: UiEvent;
}

export interface UiActorRef {
  send(event: UiXStateEvent): void;
}

export class XStateEventRouter {
  private readonly owners = new Map<UiNodeId, Set<UiActorRef>>();
  register(id: UiNodeId, actor: UiActorRef): () => void {
    const actors = this.owners.get(id) ?? new Set<UiActorRef>();
    actors.add(actor);
    this.owners.set(id, actors);
    return () => this.unregister(id, actor);
  }

  route(event: UiEvent): void {
    const actors = this.resolveActors(event);
    const actorEvent = toXStateEvent(event);
    actors.forEach((actor) => actor.send(actorEvent));
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

export function toXStateEvent(event: UiEvent): UiXStateEvent {
  return Object.freeze({ type: event.type, uiEvent: event });
}

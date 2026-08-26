import type { UiEvent, UiNodeId } from "@unislang/unifold-events";
import { Observable, Subject } from "rxjs";

export interface UiEventFabric {
  readonly events$: Observable<UiEvent>;
  nodeEvents(id: UiNodeId): Observable<UiEvent>;
  scopeEvents(id: UiNodeId): Observable<UiEvent>;
  typeEvents(type: string): Observable<UiEvent>;
}

export interface UiEventFabricController {
  readonly fabric: UiEventFabric;
  dispose(): void;
  publish(event: UiEvent): void;
}

class IndexedChannel {
  readonly subject = new Subject<UiEvent>();
  readonly observable: Observable<UiEvent>;
  private subscriptions = 0;

  constructor(onEmpty: () => void) {
    this.observable = new Observable((subscriber) => {
      this.subscriptions += 1;
      const subscription = this.subject.subscribe(subscriber);
      return () => this.unsubscribe(subscription, onEmpty);
    });
  }

  private unsubscribe(subscription: { unsubscribe(): void }, onEmpty: () => void): void {
    subscription.unsubscribe();
    this.subscriptions -= 1;
    if (this.subscriptions === 0) onEmpty();
  }
}

export function createEventFabric(): UiEventFabricController {
  const root = new Subject<UiEvent>();
  const nodes = new Map<UiNodeId, IndexedChannel>();
  const scopes = new Map<UiNodeId, IndexedChannel>();
  const types = new Map<string, IndexedChannel>();
  let disposed = false;

  const channel = (map: Map<string, IndexedChannel>, key: string) => {
    const existing = map.get(key);
    if (existing) return existing;
    const created = new IndexedChannel(() => map.delete(key));
    map.set(key, created);
    return created;
  };

  const fabric = createReadonlyFabric(root, nodes, scopes, types, channel);

  const publish = (event: UiEvent): void => {
    if (disposed) throw new Error("The event fabric is disposed.");
    root.next(event);
    publishIndexed(event, nodes, scopes, types);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    completeChannels(root, nodes, scopes, types);
  };

  return { fabric, publish, dispose };
}

function createReadonlyFabric(
  root: Subject<UiEvent>,
  nodes: Map<string, IndexedChannel>,
  scopes: Map<string, IndexedChannel>,
  types: Map<string, IndexedChannel>,
  channel: (map: Map<string, IndexedChannel>, key: string) => IndexedChannel
): UiEventFabric {
  return {
    events$: root.asObservable(),
    nodeEvents: (id) => channel(nodes, id).observable,
    scopeEvents: (id) => channel(scopes, id).observable,
    typeEvents: (type) => channel(types, type).observable
  };
}

function publishIndexed(
  event: UiEvent,
  nodes: Map<string, IndexedChannel>,
  scopes: Map<string, IndexedChannel>,
  types: Map<string, IndexedChannel>
): void {
  publishSource(event, nodes);
  publishScopes(event, scopes);
  publishChannel(types.get(event.type), event);
}

function publishSource(event: UiEvent, nodes: Map<string, IndexedChannel>): void {
  const source = event.data.sourceNode;
  if (!source) return;
  publishChannel(nodes.get(source.id), event);
}

function publishScopes(event: UiEvent, scopes: Map<string, IndexedChannel>): void {
  const ids = event.data.sourceNode?.scopePath ?? [];
  ids.forEach((id) => publishChannel(scopes.get(id), event));
}

function publishChannel(channel: IndexedChannel | undefined, event: UiEvent): void {
  if (channel) channel.subject.next(event);
}

function completeChannels(
  root: Subject<UiEvent>,
  nodes: Map<string, IndexedChannel>,
  scopes: Map<string, IndexedChannel>,
  types: Map<string, IndexedChannel>
): void {
  root.complete();
  for (const map of [nodes, scopes, types]) {
    map.forEach((entry) => entry.subject.complete());
    map.clear();
  }
}

import { CatalogBindingKind, type ComponentDescriptor } from "@unislang/unifold-catalog";

import { applyBindings } from "./bindings.js";
import type { PendingElementDefinitionOptions, RenderedNode, UnifoldElementHost } from "./types.js";

interface PendingUpgrade {
  readonly element: UnifoldElementHost;
  readonly nodeId: string;
  readonly tagName: string;
}

const watchedElements = new WeakSet<UnifoldElementHost>();

export function watchPendingElementUpgrades(
  options: PendingElementDefinitionOptions,
  renderedNodes: readonly RenderedNode[],
  renderedNode: (id: string) => RenderedNode | undefined,
  active: () => boolean
): void {
  const coordinator = new PendingElementUpgradeCoordinator(options, renderedNode, active);
  renderedNodes.forEach((rendered) => watchRenderedNode(coordinator, rendered));
}

function watchRenderedNode(
  coordinator: PendingElementUpgradeCoordinator,
  rendered: RenderedNode
): void {
  if (watchedElements.has(rendered.element)) return;
  watchedElements.add(rendered.element);
  coordinator.schedule(rendered);
}

class PendingElementUpgradeCoordinator {
  constructor(
    private readonly options: PendingElementDefinitionOptions | undefined,
    private readonly renderedNode: (id: string) => RenderedNode | undefined,
    private readonly active: () => boolean = () => true
  ) {}

  schedule(rendered: RenderedNode): void {
    const options = this.options;
    const tagName = rendered.descriptor.tagName;
    if (options === undefined) return;
    const pending = { element: rendered.element, nodeId: rendered.node.id, tagName };
    const definition = options.registry.get(tagName);
    if (definition !== undefined) {
      this.replay(pending, definition);
      return;
    }
    void options.registry.whenDefined(tagName).then(
      () => this.replayDefined(pending),
      () => undefined
    );
  }

  private replayDefined(pending: PendingUpgrade): void {
    const definition = this.options?.registry.get(pending.tagName);
    if (definition !== undefined) this.replay(pending, definition);
  }

  private replay(pending: PendingUpgrade, definition: CustomElementConstructor): void {
    const rendered = this.currentRendered(pending);
    if (rendered === undefined || !this.accepts(pending.tagName, definition)) return;
    replayProperties(rendered);
    replayHostContext(rendered);
    adoptRenderedChildren(rendered.element);
  }

  private currentRendered(pending: PendingUpgrade): RenderedNode | undefined {
    if (!this.active()) return undefined;
    const rendered = this.renderedNode(pending.nodeId);
    return matchingRenderedNode(rendered, pending.element);
  }

  private accepts(tagName: string, definition: CustomElementConstructor): boolean {
    return this.options?.acceptsDefinition(tagName, definition) === true;
  }
}

function matchingRenderedNode(
  rendered: RenderedNode | undefined,
  element: UnifoldElementHost
): RenderedNode | undefined {
  if (rendered === undefined) return undefined;
  return rendered.element === element ? rendered : undefined;
}

function replayProperties(rendered: RenderedNode): void {
  removeShadowingProperties(rendered.element, rendered.descriptor);
  applyBindings(rendered.element, rendered.descriptor, undefined, rendered.properties);
}

function removeShadowingProperties(
  element: UnifoldElementHost,
  descriptor: ComponentDescriptor
): void {
  descriptor.properties
    .filter(({ bindingKind }) => bindingKind !== CatalogBindingKind.Attribute)
    .forEach(({ bindingName, name }) => Reflect.deleteProperty(element, bindingName ?? name));
}

function replayHostContext(rendered: RenderedNode): void {
  Reflect.deleteProperty(rendered.element, "eventNode");
  Reflect.deleteProperty(rendered.element, "runtimeContext");
  rendered.element.id = rendered.node.id;
  rendered.element.dataset["unifoldNodeId"] = rendered.node.id;
  rendered.element.eventNode = rendered.eventNode;
  rendered.element.runtimeContext = rendered.runtimeContext;
}

function adoptRenderedChildren(element: UnifoldElementHost): void {
  const container = element.unifoldChildContainer;
  if (container === undefined || container === element) return;
  [...element.children]
    .filter((child) => !child.contains(container))
    .forEach((child) => container.append(child));
}

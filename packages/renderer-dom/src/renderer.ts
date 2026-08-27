import { coreCatalog, type ComponentCatalog } from "@unislang/unifold-catalog";
import type { UiNodeSnapshot, UiRuntimeContext, UiValidationError } from "@unislang/unifold-events";
import { defaultValidationMessage } from "@unislang/unifold-forms";
import type { CoreComponentType, UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { applyBindings } from "./bindings.js";
import { focusMayBeRetried, focusMayBeStarted, focusRenderedElement } from "./focus-target.js";
import { createNodeSnapshot, createProjectedProperties } from "./snapshot.js";
import type {
  DomRenderController,
  DomRendererOptions,
  PendingElementDefinitionOptions,
  RenderedNode,
  UnifoldElementHost
} from "./types.js";

export function renderIrDocument(
  document: UnifoldIrDocument,
  container: HTMLElement,
  options: DomRendererOptions = {}
): DomRenderController {
  const renderer = new DomRenderer(
    container,
    options.catalog ?? coreCatalog,
    options.runtimeContext,
    options.validationMessage,
    options.pendingElementDefinitions
  );
  renderer.mount(document);
  return renderer;
}

class DomRenderer implements DomRenderController {
  private document: UnifoldIrDocument | undefined;
  private readonly nodes = new Map<string, RenderedNode>();
  private stateRevision = 0;
  private readonly validationMessage: NonNullable<DomRendererOptions["validationMessage"]>;

  constructor(
    private readonly container: HTMLElement,
    private readonly catalog: ComponentCatalog,
    private readonly runtimeOverrides?: Partial<UiRuntimeContext>,
    validationMessage?: DomRendererOptions["validationMessage"],
    private readonly pendingDefinitions?: DomRendererOptions["pendingElementDefinitions"]
  ) {
    this.validationMessage = validationMessage ?? defaultValidationMessage;
  }

  mount(document: UnifoldIrDocument): void {
    this.validate(document);
    this.document = document;
    const root = this.createElement(document.rootNodeId, document);
    this.container.replaceChildren(root);
    this.queuePendingUpgrades();
  }

  update(document: UnifoldIrDocument): void {
    this.validate(document);
    const previous = this.requireDocument();
    this.stateRevision += 1;
    if (!sameRoot(previous, document)) {
      this.remount(document);
      return;
    }
    this.removeMissingNodes(document);
    this.reconcileNode(document.rootNodeId, document);
    this.document = document;
    this.queuePendingUpgrades();
  }

  dispose(): void {
    this.container.replaceChildren();
    this.nodes.clear();
    this.document = undefined;
  }

  getElement(nodeId: string): HTMLElement | undefined {
    return this.nodes.get(nodeId)?.element;
  }

  validate(document: UnifoldIrDocument): void {
    document.renderOrder.forEach((id) => this.requireDescriptor(requireNode(document, id)));
  }

  project(snapshot: UiNodeSnapshot, routedErrors: readonly UiValidationError[] = []): void {
    const rendered = this.nodes.get(snapshot.id);
    if (rendered === undefined) throw new Error(`Rendered node is missing: ${snapshot.id}.`);
    const properties = createProjectedProperties(snapshot, routedErrors, this.validationMessage);
    applyBindings(rendered.element, rendered.descriptor, rendered.properties, properties);
    rendered.element.eventNode = snapshot;
    rendered.eventNode = snapshot;
    rendered.properties = properties;
  }

  async restoreFocus(nodeId: string, controlIndex?: number): Promise<void> {
    const element = this.getElement(nodeId) as UnifoldElementHost | undefined;
    if (element === undefined) return;
    await completeFocusRestore(element, controlIndex);
  }

  private createElement(id: string, document: UnifoldIrDocument): UnifoldElementHost {
    const node = requireNode(document, id);
    const element = this.createHost(node, document);
    const container = childContainer(element);
    node.childIds.forEach((childId) => container.append(this.createElement(childId, document)));
    return element;
  }

  private createHost(node: UnifoldIrNode, document: UnifoldIrDocument): UnifoldElementHost {
    const descriptor = this.requireDescriptor(node);
    const element = documentOwner(this.container).createElement(
      descriptor.tagName
    ) as UnifoldElementHost;
    const eventNode = createNodeSnapshot(node, this.stateRevision);
    const runtimeContext = this.runtimeContext(document);
    configureHost(element, node, eventNode, runtimeContext);
    applyBindings(element, descriptor, undefined, node.properties);
    const rendered = {
      descriptor,
      element,
      eventNode,
      node,
      properties: node.properties,
      runtimeContext
    };
    this.nodes.set(node.id, rendered);
    return element;
  }

  private queuePendingUpgrades(): void {
    const definitions = this.pendingDefinitions;
    if (definitions === undefined) return;
    const pending = [...this.nodes.values()].filter(
      ({ descriptor }) => definitions.registry.get(descriptor.tagName) === undefined
    );
    if (pending.length === 0) return;
    queueMicrotask(() => void this.loadPendingUpgrades(definitions, pending));
  }

  private async loadPendingUpgrades(
    definitions: PendingElementDefinitionOptions,
    pending: readonly RenderedNode[]
  ): Promise<void> {
    const { watchPendingElementUpgrades } = await import("./pending-element-upgrades.js");
    watchPendingElementUpgrades(
      definitions,
      pending,
      (id) => this.nodes.get(id),
      () => this.document !== undefined
    );
  }

  private requireDescriptor(node: UnifoldIrNode) {
    const descriptor = this.catalog.components[node.componentType as CoreComponentType];
    if (descriptor === undefined) throw new Error(`No DOM descriptor for ${node.componentType}.`);
    return descriptor;
  }

  private reconcileNode(id: string, document: UnifoldIrDocument): UnifoldElementHost {
    const next = requireNode(document, id);
    let rendered = this.nodes.get(id);
    if (rendered === undefined)
      rendered = this.requireRendered(this.createHost(next, document), id);
    if (rendered.node.componentType !== next.componentType) {
      rendered = this.replaceHost(rendered, next, document);
    }
    this.updateRendered(rendered, next, document);
    const container = childContainer(rendered.element);
    next.childIds.forEach((childId, index) => {
      placeChild(container, this.reconcileNode(childId, document), index);
    });
    return rendered.element;
  }

  private updateRendered(
    rendered: RenderedNode,
    next: UnifoldIrNode,
    document: UnifoldIrDocument
  ): void {
    if (!sameProperties(rendered.node, next)) {
      applyBindings(rendered.element, rendered.descriptor, rendered.properties, next.properties);
    }
    rendered.eventNode = createNodeSnapshot(next, this.stateRevision);
    rendered.runtimeContext = this.runtimeContext(document);
    rendered.element.eventNode = rendered.eventNode;
    rendered.element.runtimeContext = rendered.runtimeContext;
    rendered.node = next;
    rendered.properties = next.properties;
  }

  private replaceHost(
    rendered: RenderedNode,
    next: UnifoldIrNode,
    document: UnifoldIrDocument
  ): RenderedNode {
    this.nodes.delete(next.id);
    const replacement = this.createHost(next, document);
    const replacementContainer = childContainer(replacement);
    [...childContainer(rendered.element).children].forEach((child) =>
      replacementContainer.append(child)
    );
    rendered.element.replaceWith(replacement);
    return this.requireRendered(replacement, next.id);
  }

  private removeMissingNodes(document: UnifoldIrDocument): void {
    this.nodes.forEach((rendered, id) => {
      if (document.nodesById[id] !== undefined) return;
      rendered.element.remove();
      this.nodes.delete(id);
    });
  }

  private requireRendered(element: UnifoldElementHost, id: string): RenderedNode {
    const rendered = this.nodes.get(id);
    if (rendered === undefined) throw new Error(`Rendered node is missing: ${element.id}.`);
    return rendered;
  }

  private remount(document: UnifoldIrDocument): void {
    this.nodes.clear();
    this.mount(document);
  }

  private runtimeContext(document: UnifoldIrDocument): UiRuntimeContext {
    return {
      ...this.runtimeOverrides,
      documentId: resolveText(this.runtimeOverrides?.documentId, document.documentId),
      documentRevision: resolveText(
        this.runtimeOverrides?.documentRevision,
        document.documentRevision
      )
    };
  }

  private requireDocument(): UnifoldIrDocument {
    if (this.document === undefined) throw new Error("The renderer is not mounted.");
    return this.document;
  }
}

function configureHost(
  element: UnifoldElementHost,
  node: UnifoldIrNode,
  eventNode: UiNodeSnapshot,
  context: UiRuntimeContext
): void {
  element.id = node.id;
  element.dataset["unifoldNodeId"] = node.id;
  element.eventNode = eventNode;
  element.runtimeContext = context;
}

function requireNode(document: UnifoldIrDocument, id: string): UnifoldIrNode {
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`IR node is missing: ${id}.`);
  return node;
}

function documentOwner(container: HTMLElement): Document {
  return container.ownerDocument;
}

function sameProperties(left: UnifoldIrNode, right: UnifoldIrNode): boolean {
  return JSON.stringify(left.properties) === JSON.stringify(right.properties);
}

function sameRoot(left: UnifoldIrDocument, right: UnifoldIrDocument): boolean {
  return left.rootNodeId === right.rootNodeId;
}

function placeChild(parent: HTMLElement, child: HTMLElement, index: number): void {
  const current = parent.children.item(index);
  if (current !== child) parent.insertBefore(child, current);
}

function childContainer(element: UnifoldElementHost): HTMLElement {
  return element.unifoldChildContainer ?? element;
}

function pendingAncestorUpdates(element: UnifoldElementHost): readonly Promise<boolean>[] {
  const updates: Promise<boolean>[] = [];
  let current: HTMLElement | null = element.parentElement;
  while (current !== null) {
    const update = (current as UnifoldElementHost).updateComplete;
    if (update !== undefined) updates.push(update);
    current = current.parentElement;
  }
  return updates;
}

async function completeFocusRestore(
  element: UnifoldElementHost,
  controlIndex: number | undefined
): Promise<void> {
  const ancestorUpdates = pendingAncestorUpdates(element);
  const active = element.ownerDocument.activeElement;
  const initial = focusRenderedElement(element, controlIndex);
  await element.updateComplete;
  const refreshed = focusAfterUpdate(element, initial, active, controlIndex);
  if (refreshed === undefined) return;
  await Promise.all(ancestorUpdates);
  retryFinalFocus(element, refreshed, controlIndex);
}

function focusAfterUpdate(
  element: UnifoldElementHost,
  initial: HTMLElement | undefined,
  previousActive: Element | null,
  controlIndex: number | undefined
): HTMLElement | undefined {
  if (initial !== undefined) return retryFocus(element, initial, controlIndex);
  return startFocusAfterUpdate(element, previousActive, controlIndex);
}

function startFocusAfterUpdate(
  element: UnifoldElementHost,
  previousActive: Element | null,
  controlIndex: number | undefined
): HTMLElement | undefined {
  if (!focusMayBeStarted(element, previousActive)) return undefined;
  return focusRenderedElement(element, controlIndex);
}

function retryFocus(
  element: UnifoldElementHost,
  target: HTMLElement,
  controlIndex: number | undefined
): HTMLElement | undefined {
  if (!focusMayBeRetried(element, target)) return undefined;
  return focusRenderedElement(element, controlIndex) ?? target;
}

function retryFinalFocus(
  element: UnifoldElementHost,
  target: HTMLElement,
  controlIndex: number | undefined
): void {
  if (focusMayBeRetried(element, target)) focusRenderedElement(element, controlIndex);
}

function resolveText(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

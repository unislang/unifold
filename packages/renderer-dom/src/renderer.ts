import { coreCatalog, type ComponentCatalog } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import type { UiNodeSnapshot, UiRuntimeContext, UiValidationError } from "@unislang/unifold-events";
import { UiNodeKind } from "@unislang/unifold-events";
import { defaultValidationMessage } from "@unislang/unifold-forms";
import type { CoreComponentType, UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { applyBindings } from "./bindings.js";
import { createNodeSnapshot } from "./snapshot.js";
import type {
  DomRenderController,
  DomRendererOptions,
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
    options.validationMessage
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
    validationMessage?: DomRendererOptions["validationMessage"]
  ) {
    this.validationMessage = validationMessage ?? defaultValidationMessage;
  }

  mount(document: UnifoldIrDocument): void {
    this.validate(document);
    this.document = document;
    const root = this.createElement(document.rootNodeId, document);
    this.container.replaceChildren(root);
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
    const properties = projectedProperties(snapshot, routedErrors, this.validationMessage);
    applyBindings(rendered.element, rendered.descriptor, rendered.properties, properties);
    rendered.element.eventNode = snapshot;
    rendered.properties = properties;
  }

  async restoreFocus(nodeId: string): Promise<void> {
    const element = this.getElement(nodeId) as UnifoldElementHost | undefined;
    if (element === undefined) return;
    await element.updateComplete;
    focusElement(element);
  }

  private createElement(id: string, document: UnifoldIrDocument): UnifoldElementHost {
    const node = requireNode(document, id);
    const element = this.createHost(node, document);
    node.childIds.forEach((childId) => element.append(this.createElement(childId, document)));
    return element;
  }

  private createHost(node: UnifoldIrNode, document: UnifoldIrDocument): UnifoldElementHost {
    const descriptor = this.requireDescriptor(node);
    const element = documentOwner(this.container).createElement(
      descriptor.tagName
    ) as UnifoldElementHost;
    configureHost(element, node, this.runtimeContext(document), this.stateRevision);
    applyBindings(element, descriptor, undefined, node.properties);
    this.nodes.set(node.id, { descriptor, element, node, properties: node.properties });
    return element;
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
    next.childIds.forEach((childId, index) => {
      placeChild(rendered.element, this.reconcileNode(childId, document), index);
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
    rendered.element.eventNode = createNodeSnapshot(next, this.stateRevision);
    rendered.element.runtimeContext = this.runtimeContext(document);
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
    [...rendered.element.children].forEach((child) => replacement.append(child));
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
  context: UiRuntimeContext,
  stateRevision: number
): void {
  element.id = node.id;
  element.dataset["unifoldNodeId"] = node.id;
  element.eventNode = createNodeSnapshot(node, stateRevision);
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

function resolveText(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function focusElement(element: HTMLElement): void {
  const target = element.shadowRoot?.querySelector<HTMLElement>(
    "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]"
  );
  (target ?? element).focus();
}

function projectedProperties(
  snapshot: UiNodeSnapshot,
  routedErrors: readonly UiValidationError[],
  formatMessage: NonNullable<DomRendererOptions["validationMessage"]>
): JsonObject {
  return {
    ...snapshot.properties,
    disabled: snapshot.base.disabled,
    readonly: snapshot.base.readonly,
    ...controlProperties(snapshot),
    ...validationProperties(snapshot, routedErrors, formatMessage)
  };
}

function controlProperties(snapshot: UiNodeSnapshot): JsonObject {
  const control = snapshot.control;
  return control === undefined ? {} : { required: control.required, value: control.rawValue };
}

function validationProperties(
  snapshot: UiNodeSnapshot,
  routedErrors: readonly UiValidationError[],
  formatMessage: NonNullable<DomRendererOptions["validationMessage"]>
): JsonObject {
  if (snapshot.control === undefined) return {};
  const messages = visibleValidationMessages(snapshot, routedErrors, formatMessage);
  if (snapshot.kind === UiNodeKind.Form) return { errorMessages: messages };
  return { errorMessage: firstMessage(messages) };
}

function firstMessage(messages: readonly string[]): string {
  return messages[0] ?? "";
}

function visibleValidationMessages(
  snapshot: UiNodeSnapshot,
  routedErrors: readonly UiValidationError[],
  formatMessage: NonNullable<DomRendererOptions["validationMessage"]>
): readonly string[] {
  const control = snapshot.control;
  if (control === undefined || !control.touched) return [];
  return [...control.errors, ...routedErrors].map(formatMessage);
}

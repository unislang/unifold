import type { ComponentCatalog, ComponentDescriptor } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import type { UiNodeSnapshot, UiRuntimeContext, UiValidationError } from "@unislang/unifold-events";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

export interface DomRendererOptions {
  readonly catalog?: ComponentCatalog;
  readonly runtimeContext?: Partial<UiRuntimeContext>;
  readonly validationMessage?: (error: UiValidationError) => string;
}

export interface DomRenderController {
  dispose(): void;
  getElement(nodeId: string): HTMLElement | undefined;
  project(snapshot: UiNodeSnapshot, routedErrors?: readonly UiValidationError[]): void;
  restoreFocus(nodeId: string): Promise<void>;
  update(document: UnifoldIrDocument): void;
  validate(document: UnifoldIrDocument): void;
}

export interface UnifoldElementHost extends HTMLElement {
  eventNode?: UiNodeSnapshot;
  readonly updateComplete?: Promise<boolean>;
  runtimeContext?: UiRuntimeContext;
}

export interface RenderedNode {
  readonly descriptor: ComponentDescriptor;
  readonly element: UnifoldElementHost;
  node: UnifoldIrNode;
  properties: JsonObject;
}

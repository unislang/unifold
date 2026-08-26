import {
  ElementDefinitionPolicy,
  ElementRegistrationStatus,
  defineUnifoldElements,
  validateUnifoldElementTags,
  type ElementRegistrationDiagnostic
} from "@unislang/unifold-elements";
import { CoreElementTag, getCoreDescriptor } from "@unislang/unifold-catalog";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type {
  DomRendererOptions,
  PendingElementDefinitionOptions
} from "@unislang/unifold-renderer-dom";

import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  type RejectedUnifoldApplicationResult
} from "./types.js";

export function registerApplicationElements(
  container: HTMLElement,
  document?: UnifoldIrDocument,
  policy = ElementDefinitionPolicy.RequireAll
): RejectedUnifoldApplicationResult | undefined {
  const registry = elementRegistry(container);
  const result = defineUnifoldElements(registry);
  if (result.status !== ElementRegistrationStatus.Registered) {
    return rejectedRegistration(result.diagnostics);
  }
  return validateApplicationElements(document, registry, policy);
}

function pendingApplicationElementDefinitions(
  container: HTMLElement,
  policy: ElementDefinitionPolicy | undefined
): PendingElementDefinitionOptions | undefined {
  if (policy !== ElementDefinitionPolicy.AllowPending) return undefined;
  const registry = elementRegistry(container);
  if (registry === null) return undefined;
  return {
    acceptsDefinition: (tagName, definition) =>
      acceptsApplicationDefinition(registry, tagName, definition),
    registry
  };
}

export function applicationRendererOptions(
  container: HTMLElement,
  renderer: DomRendererOptions | undefined,
  policy: ElementDefinitionPolicy | undefined
): DomRendererOptions {
  const pendingElementDefinitions = pendingApplicationElementDefinitions(container, policy);
  if (pendingElementDefinitions === undefined) return renderer ?? {};
  return { ...renderer, pendingElementDefinitions };
}

function acceptsApplicationDefinition(
  registry: CustomElementRegistry,
  tagName: string,
  definition: CustomElementConstructor
): boolean {
  const tag = coreElementTag(tagName);
  if (tag === undefined || registry.get(tag) !== definition) return false;
  return (
    validateUnifoldElementTags([tag], registry).status === ElementRegistrationStatus.Registered
  );
}

function coreElementTag(value: string): CoreElementTag | undefined {
  return Object.values(CoreElementTag).find((tagName) => tagName === value);
}

function validateApplicationElements(
  document: UnifoldIrDocument | undefined,
  registry: CustomElementRegistry | null,
  policy: ElementDefinitionPolicy
): RejectedUnifoldApplicationResult | undefined {
  if (document === undefined) return undefined;
  const validation = validateUnifoldElementTags(requiredCoreTags(document), registry, policy);
  if (validation.status === ElementRegistrationStatus.Registered) return undefined;
  return rejectedRegistration(validation.diagnostics);
}

function requiredCoreTags(document: UnifoldIrDocument): readonly CoreElementTag[] {
  const tags = Object.values(document.nodesById).flatMap(({ componentType }) => {
    const descriptor = getCoreDescriptor(componentType);
    return descriptor === undefined ? [] : [descriptor.tagName];
  });
  return [...new Set(tags)];
}

function rejectedRegistration(
  diagnostics: readonly ElementRegistrationDiagnostic[]
): RejectedUnifoldApplicationResult {
  return {
    diagnostics: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      path: "/catalog",
      stage: UnifoldApplicationDiagnosticStage.ElementRegistration
    })),
    status: UnifoldApplicationMountStatus.Rejected
  };
}

function elementRegistry(container: HTMLElement): CustomElementRegistry | null {
  const view = container.ownerDocument.defaultView;
  if (view === null) return null;
  return view.customElements;
}

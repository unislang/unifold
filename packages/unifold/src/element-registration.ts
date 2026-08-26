import {
  ElementRegistrationStatus,
  defineUnifoldElements,
  validateUnifoldElementTags,
  type ElementRegistrationDiagnostic
} from "@unislang/unifold-elements";
import { getCoreDescriptor, type CoreElementTag } from "@unislang/unifold-catalog";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";

import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  type RejectedUnifoldApplicationResult
} from "./types.js";

export function registerApplicationElements(
  container: HTMLElement,
  document?: UnifoldIrDocument
): RejectedUnifoldApplicationResult | undefined {
  const registry = elementRegistry(container);
  const result = defineUnifoldElements(registry);
  if (result.status !== ElementRegistrationStatus.Registered) {
    return rejectedRegistration(result.diagnostics);
  }
  return validateApplicationElements(document, registry);
}

function validateApplicationElements(
  document: UnifoldIrDocument | undefined,
  registry: CustomElementRegistry | null
): RejectedUnifoldApplicationResult | undefined {
  if (document === undefined) return undefined;
  const validation = validateUnifoldElementTags(requiredCoreTags(document), registry);
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

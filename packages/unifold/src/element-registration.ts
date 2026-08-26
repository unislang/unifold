import {
  ElementRegistrationStatus,
  defineUnifoldElements,
  type ElementRegistrationDiagnostic
} from "@unislang/unifold-elements";

import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  type RejectedUnifoldApplicationResult
} from "./types.js";

export function registerApplicationElements(
  container: HTMLElement
): RejectedUnifoldApplicationResult | undefined {
  const result = defineUnifoldElements(elementRegistry(container));
  if (result.status === ElementRegistrationStatus.Registered) return undefined;
  return rejectedRegistration(result.diagnostics);
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

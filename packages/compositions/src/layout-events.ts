import { UiComponentEventBinding, type JsonObject } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode, LayoutEventName } from "./enums.js";
import { addLayoutDiagnostic, isLayoutObject, isSafeLayoutName } from "./layout-values.js";
import type { CompositionDiagnostic } from "./types.js";

const EVENT_TYPES: Readonly<Record<LayoutEventName, UiComponentEventBinding>> = {
  [LayoutEventName.Blur]: UiComponentEventBinding.Blurred,
  [LayoutEventName.Click]: UiComponentEventBinding.Activated,
  [LayoutEventName.Input]: UiComponentEventBinding.Input,
  [LayoutEventName.Reset]: UiComponentEventBinding.ResetRequested,
  [LayoutEventName.Submit]: UiComponentEventBinding.SubmitRequested
};

export function resolveLayoutEvents(
  value: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonObject | undefined {
  if (value === undefined) return {};
  if (!isLayoutObject(value)) return invalidEvents(path, diagnostics);
  return eventBindings(value, path, diagnostics);
}

function eventBindings(
  value: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonObject {
  const bindings: Record<string, string> = {};
  Object.entries(value).forEach(([alias, target]) =>
    resolveEvent(alias, target, path, diagnostics, bindings)
  );
  if (Object.keys(bindings).length === 0) return {};
  return { events: bindings };
}

function resolveEvent(
  alias: string,
  target: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[],
  bindings: Record<string, string>
): void {
  const canonical = EVENT_TYPES[alias as LayoutEventName];
  if (canonical === undefined) return invalidEvent(alias, path, diagnostics);
  if (!isSafeLayoutName(target)) return invalidEvent(alias, path, diagnostics);
  bindings[canonical] = target;
}

function invalidEvents(path: string, diagnostics: CompositionDiagnostic[]): undefined {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutEvent,
    path,
    "Node events must be an object."
  );
  return undefined;
}

function invalidEvent(alias: string, path: string, diagnostics: CompositionDiagnostic[]): void {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutEvent,
    `${path}/${alias}`,
    `Invalid layout event binding "${alias}".`
  );
}

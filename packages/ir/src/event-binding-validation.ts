import { getCoreComponentEvents } from "@unislang/unifold-catalog";
import { UiComponentEventBinding } from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

const EVENT_BINDINGS = new Set<string>(Object.values(UiComponentEventBinding));

export function validateNodeEventBindings(
  value: unknown,
  component: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) return addInvalid("events must be an object.", path, diagnostics);
  Object.entries(value).forEach(([binding, eventType]) =>
    validateBinding(binding, eventType, component, path, diagnostics)
  );
}

function validateBinding(
  binding: string,
  eventType: unknown,
  component: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const bindingPath = `${path}/${binding}`;
  if (!EVENT_BINDINGS.has(binding)) {
    addInvalid(`Unknown component event binding "${binding}".`, bindingPath, diagnostics);
    return;
  }
  validateSupported(binding as UiComponentEventBinding, component, bindingPath, diagnostics);
  if (!isValidEventType(eventType))
    addInvalid("A workflow event binding must be a non-empty string.", bindingPath, diagnostics);
}

function isValidEventType(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return value.length > 0;
}

function validateSupported(
  binding: UiComponentEventBinding,
  component: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const name = componentName(component);
  if (getCoreComponentEvents(name).includes(binding)) return;
  addInvalid(`Component "${name}" does not emit "${binding}".`, path, diagnostics);
}

function componentName(component: string | undefined): string {
  return component === undefined ? "unknown" : component;
}

function addInvalid(message: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidEventBinding, message, path));
}

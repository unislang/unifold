import type { UnifoldIrNode } from "@unislang/unifold-ir";

type HydrationErrorFactory = () => Error;

export function readStaticSwitchValue(
  node: UnifoldIrNode,
  control: HTMLElement,
  invalid: HydrationErrorFactory
): boolean {
  const input = requireSwitchInput(control, invalid);
  if (!matchesContract(node, input)) throw invalid();
  return input.checked;
}

function requireSwitchInput(
  control: HTMLElement,
  invalid: HydrationErrorFactory
): HTMLInputElement {
  if (!(control instanceof HTMLInputElement)) throw invalid();
  const valid = [control.type === "checkbox", control.getAttribute("role") === "switch"].every(
    Boolean
  );
  if (!valid) throw invalid();
  return control;
}

function matchesContract(node: UnifoldIrNode, input: HTMLInputElement): boolean {
  return [
    input.name === stringProperty(node, "name"),
    input.disabled === booleanProperty(node, "disabled"),
    input.required === booleanProperty(node, "required")
  ].every(Boolean);
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}

function booleanProperty(node: UnifoldIrNode, name: string): boolean {
  return node.properties[name] === true;
}

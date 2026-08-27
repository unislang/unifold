import { DateFieldAutocomplete } from "@unislang/unifold-catalog";
import { isJsonDateValue, jsonDateConstraintIssue } from "@unislang/unifold-contracts";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

type HydrationErrorFactory = () => Error;

export function readStaticDateFieldValue(
  node: UnifoldIrNode,
  control: HTMLElement,
  invalid: HydrationErrorFactory
): string {
  const input = requireDateInput(control, invalid);
  if (!matchesContract(node, input)) throw invalid();
  if (!validValue(node, input.value)) throw invalid();
  return input.value;
}

function requireDateInput(control: HTMLElement, invalid: HydrationErrorFactory): HTMLInputElement {
  if (!(control instanceof HTMLInputElement) || control.getAttribute("type") !== "date")
    throw invalid();
  return control;
}

function matchesContract(node: UnifoldIrNode, input: HTMLInputElement): boolean {
  return [
    input.autocomplete === stringProperty(node, "autocomplete", DateFieldAutocomplete.Off),
    input.name === stringProperty(node, "name"),
    input.min === stringProperty(node, "min"),
    input.max === stringProperty(node, "max"),
    input.step === String(numberProperty(node, "step", 1)),
    input.disabled === booleanProperty(node, "disabled"),
    input.readOnly === booleanProperty(node, "readonly"),
    input.required === booleanProperty(node, "required")
  ].every(Boolean);
}

function validValue(node: UnifoldIrNode, value: string): boolean {
  if (!isJsonDateValue(value)) return false;
  return (
    jsonDateConstraintIssue(
      value,
      stringProperty(node, "min"),
      stringProperty(node, "max"),
      numberProperty(node, "step", 1)
    ) === undefined
  );
}

function stringProperty(node: UnifoldIrNode, name: string, fallback = ""): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : fallback;
}

function numberProperty(node: UnifoldIrNode, name: string, fallback: number): number {
  const value = node.properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanProperty(node: UnifoldIrNode, name: string): boolean {
  return node.properties[name] === true;
}

import { MAXIMUM_SEARCH_QUERY_LENGTH } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

type HydrationErrorFactory = () => Error;

export function readStaticSearchFieldValue(
  node: UnifoldIrNode,
  control: HTMLElement,
  invalid: HydrationErrorFactory
): string {
  const input = requireSearchInput(control, invalid);
  validateQueryLength(node, input.value, invalid);
  return input.value;
}

function requireSearchInput(
  control: HTMLElement,
  invalid: HydrationErrorFactory
): HTMLInputElement {
  if (!(control instanceof HTMLInputElement) || control.type !== "search") throw invalid();
  return control;
}

function validateQueryLength(
  node: UnifoldIrNode,
  value: string,
  invalid: HydrationErrorFactory
): void {
  if (value.length > queryMaximum(node)) throw invalid();
}

function queryMaximum(node: UnifoldIrNode): number {
  const value = node.properties["maxLength"];
  return typeof value === "number" ? value : MAXIMUM_SEARCH_QUERY_LENGTH;
}

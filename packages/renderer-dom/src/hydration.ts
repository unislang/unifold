import { jsonNumberConstraintIssue, type JsonValue } from "@unislang/unifold-contracts";
import {
  CoreComponentType,
  type UnifoldIrDocument,
  type UnifoldIrNode
} from "@unislang/unifold-ir";

import { readStaticCheckboxGroupValue } from "./checkbox-group-hydration.js";
import { readStaticDateFieldValue } from "./date-field-hydration.js";
import { isStaticChoiceComponent, isStaticValueComponent } from "./hydration-components.js";
import { captureStaticHydrationFocus, type StaticHydrationFocusState } from "./hydration-focus.js";
import { readStaticSearchFieldValue } from "./search-field-hydration.js";
import { readStaticSwitchValue } from "./switch-hydration.js";

const DOCUMENT_ATTRIBUTE = "data-unifold-static-document";
const NODE_ATTRIBUTE = "data-unifold-static-node-id";
const COMPONENT_ATTRIBUTE = "data-unifold-static-component";
const CONTROL_ATTRIBUTE = "data-unifold-static-control";

export interface StaticDomHydrationState extends StaticHydrationFocusState {
  readonly values: Readonly<Record<string, JsonValue>>;
}

export class StaticDomHydrationError extends Error {}

export function captureStaticDomHydration(
  document: UnifoldIrDocument,
  container: HTMLElement
): StaticDomHydrationState {
  const root = requireStaticRoot(container, document.documentId);
  const focus = captureStaticHydrationFocus(root);
  const elements = staticNodeElements(root);
  validateNodeSequence(document, elements);
  validateNodeHierarchy(document, elements);
  return {
    ...focus,
    values: captureControlValues(document, elements)
  };
}

function requireStaticRoot(container: HTMLElement, documentId: string): HTMLElement {
  const candidates = [
    container,
    ...container.querySelectorAll<HTMLElement>(`[${DOCUMENT_ATTRIBUTE}]`)
  ].filter((element) => element.getAttribute(DOCUMENT_ATTRIBUTE) === documentId);
  if (candidates.length !== 1)
    throw hydrationError("Static document root is missing or duplicated.");
  return candidates[0] as HTMLElement;
}

function staticNodeElements(root: HTMLElement): readonly HTMLElement[] {
  const descendants = [...root.querySelectorAll<HTMLElement>(`[${NODE_ATTRIBUTE}]`)];
  return root.hasAttribute(NODE_ATTRIBUTE) ? [root, ...descendants] : descendants;
}

function validateNodeSequence(document: UnifoldIrDocument, elements: readonly HTMLElement[]): void {
  if (elements.length !== document.renderOrder.length)
    throw hydrationError("Static node count differs from IR.");
  document.renderOrder.forEach((id, index) => validateNodeElement(document, id, elements[index]));
}

function validateNodeElement(
  document: UnifoldIrDocument,
  id: string,
  element: HTMLElement | undefined
): void {
  const node = requireNode(document, id);
  const staticElement = requireElement(element, id);
  if (staticElement.getAttribute(NODE_ATTRIBUTE) !== id)
    throw hydrationError(`Static node order differs: ${id}.`);
  if (staticElement.getAttribute(COMPONENT_ATTRIBUTE) !== node.componentType)
    throw hydrationError(`Static component differs: ${id}.`);
}

function validateNodeHierarchy(
  document: UnifoldIrDocument,
  elements: readonly HTMLElement[]
): void {
  const byId = new Map(elements.map((element) => [element.getAttribute(NODE_ATTRIBUTE), element]));
  document.renderOrder.forEach((id) => validateParent(requireNode(document, id), byId.get(id)));
}

function validateParent(node: UnifoldIrNode, element: HTMLElement | undefined): void {
  const staticElement = requireElement(element, node.id);
  const parentId = closestNodeId(staticElement.parentElement);
  if (parentId !== node.parentId) throw hydrationError(`Static parent differs: ${node.id}.`);
}

function closestNodeId(element: HTMLElement | null): string | null | undefined {
  if (element === null) return undefined;
  return element.closest<HTMLElement>(`[${NODE_ATTRIBUTE}]`)?.getAttribute(NODE_ATTRIBUTE);
}

function captureControlValues(
  document: UnifoldIrDocument,
  elements: readonly HTMLElement[]
): Readonly<Record<string, JsonValue>> {
  const values = Object.create(null) as Record<string, JsonValue>;
  elements.forEach((element) => captureNodeValue(document, element, values));
  return Object.freeze(values);
}

function captureNodeValue(
  document: UnifoldIrDocument,
  element: HTMLElement,
  values: Record<string, JsonValue>
): void {
  const id = requiredAttribute(element, NODE_ATTRIBUTE);
  const node = requireNode(document, id);
  if (!isStaticValueComponent(node.componentType)) return;
  const controls = staticControls(element, id);
  if (controls.length === 0) return;
  const value = readControlValue(node, controls);
  validateChoiceValue(node, value);
  values[id] = value;
}

function staticControls(element: HTMLElement, id: string): readonly HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>(`[${CONTROL_ATTRIBUTE}]`)].filter((control) => {
    return (
      control.getAttribute(CONTROL_ATTRIBUTE) === id &&
      control.closest(`[${NODE_ATTRIBUTE}]`) === element
    );
  });
}

function readControlValue(node: UnifoldIrNode, controls: readonly HTMLElement[]): JsonValue {
  if (node.componentType === CoreComponentType.CheckboxGroup)
    return readStaticCheckboxGroupValue(node, controls, () =>
      hydrationError(`Static checkbox group is invalid: ${node.id}.`)
    );
  return readScalarOrRadioValue(node, controls);
}

function readScalarOrRadioValue(node: UnifoldIrNode, controls: readonly HTMLElement[]): JsonValue {
  if (controls.every(isRadioInput)) return selectedRadioValue(controls);
  if (controls.length !== 1) throw hydrationError("Static control is duplicated.");
  return scalarControlValue(node, controls[0] as HTMLElement);
}

function selectedRadioValue(controls: readonly HTMLElement[]): string {
  const selected = controls.find(isChecked);
  if (selected === undefined) return "";
  return selected.getAttribute("value") ?? "";
}

function scalarControlValue(node: UnifoldIrNode, control: HTMLElement): JsonValue {
  if (node.componentType === CoreComponentType.NumberField)
    return numberControlValue(node, control);
  return nonNumberComponentValue(node, control);
}

function nonNumberComponentValue(node: UnifoldIrNode, control: HTMLElement): JsonValue {
  if (node.componentType === CoreComponentType.DateField)
    return readStaticDateFieldValue(node, control, () =>
      hydrationError(`Static date control is invalid: ${node.id}.`)
    );
  return stringOrBooleanComponentValue(node, control);
}

function stringOrBooleanComponentValue(node: UnifoldIrNode, control: HTMLElement): JsonValue {
  if (node.componentType === CoreComponentType.SearchField)
    return readStaticSearchFieldValue(node, control, () =>
      hydrationError(`Static search control is invalid: ${node.id}.`)
    );
  if (node.componentType === CoreComponentType.Switch)
    return readStaticSwitchValue(node, control, () =>
      hydrationError(`Static switch control is invalid: ${node.id}.`)
    );
  return nonNumberControlValue(control);
}

function nonNumberControlValue(control: HTMLElement): JsonValue {
  if (isCheckboxInput(control)) return control.checked;
  if (isMultipleSelect(control)) return [...control.selectedOptions].map(({ value }) => value);
  return requiredScalarValue(control);
}

function numberControlValue(node: UnifoldIrNode, control: HTMLElement): number | null {
  const input = requireNumberInput(node, control);
  if (input.value === "") return null;
  return validNumberControlValue(node, input.valueAsNumber);
}

function requireNumberInput(node: UnifoldIrNode, control: HTMLElement): HTMLInputElement {
  if (!(control instanceof HTMLInputElement) || control.type !== "number")
    throw hydrationError(`Static numeric control is invalid: ${node.id}.`);
  return control;
}

function validNumberControlValue(node: UnifoldIrNode, value: number): number {
  if (!Number.isFinite(value)) throw invalidNumberValueError(node);
  if (numberConstraintIssue(node, value)) throw invalidNumberValueError(node);
  return value;
}

function invalidNumberValueError(node: UnifoldIrNode): StaticDomHydrationError {
  return hydrationError(`Static numeric value is invalid: ${node.id}.`);
}

function numberConstraintIssue(node: UnifoldIrNode, value: number): boolean {
  const minimum = numberProperty(node, "min");
  const maximum = numberProperty(node, "max");
  return (
    jsonNumberConstraintIssue(
      value,
      nullableNumber(minimum),
      nullableNumber(maximum),
      numberOr(numberProperty(node, "step"), 1)
    ) !== undefined
  );
}

function nullableNumber(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

function numberOr(value: number | undefined, fallback: number): number {
  return value === undefined ? fallback : value;
}

function numberProperty(node: UnifoldIrNode, name: string): number | undefined {
  const value = node.properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function requiredScalarValue(control: HTMLElement): string {
  if (isValueControl(control)) return control.value;
  throw hydrationError("Static control type is unsupported.");
}

function validateChoiceValue(node: UnifoldIrNode, value: JsonValue): void {
  if (!isStaticChoiceComponent(node.componentType)) return;
  const allowed = declaredChoiceValues(node);
  const choices = choiceValues(value);
  if (invalidChoiceValues(choices, allowed))
    throw hydrationError(`Static choice value is invalid: ${node.id}.`);
}

function invalidChoiceValues(choices: readonly JsonValue[], allowed: ReadonlySet<string>): boolean {
  if (hasDuplicateChoices(choices)) return true;
  return choices.some((item) => isInvalidChoice(item, allowed));
}

function hasDuplicateChoices(values: readonly JsonValue[]): boolean {
  const strings = values.filter((value): value is string => typeof value === "string");
  return new Set(strings).size !== strings.length;
}

function choiceValues(value: JsonValue): readonly JsonValue[] {
  return Array.isArray(value) ? value : [value];
}

function isInvalidChoice(value: JsonValue, allowed: ReadonlySet<string>): boolean {
  if (typeof value !== "string") return true;
  if (value === "") return false;
  return !allowed.has(value);
}

function declaredChoiceValues(node: UnifoldIrNode): ReadonlySet<string> {
  const component = node.componentType as CoreComponentType;
  const choices = node.properties[propertyName(choiceProperty, component, "options")];
  if (!Array.isArray(choices)) return new Set();
  const valueProperty = propertyName(choiceValueProperty, component, "value");
  return new Set(choices.flatMap((choice) => objectStringValue(choice, valueProperty)));
}

function objectStringValue(value: JsonValue, property: string): readonly string[] {
  if (!isNonNullObject(value)) return [];
  if (Array.isArray(value)) return [];
  return stringList(value[property]);
}

const choiceProperty: Partial<Record<CoreComponentType, string>> = {
  [CoreComponentType.Tabs]: "tabs"
};

const choiceValueProperty: Partial<Record<CoreComponentType, string>> = {
  [CoreComponentType.Tabs]: "id"
};

function propertyName(
  names: Partial<Record<CoreComponentType, string>>,
  component: CoreComponentType,
  fallback: string
): string {
  return names[component] ?? fallback;
}

function stringList(value: JsonValue | undefined): readonly string[] {
  return typeof value === "string" ? [value] : [];
}

function isNonNullObject(value: JsonValue): value is Record<string, JsonValue> {
  if (value === null) return false;
  return typeof value === "object";
}

function isCheckboxInput(control: HTMLElement): control is HTMLInputElement {
  return control instanceof HTMLInputElement && control.type === "checkbox";
}

function isMultipleSelect(control: HTMLElement): control is HTMLSelectElement {
  return control instanceof HTMLSelectElement && control.multiple;
}

function isRadioInput(control: HTMLElement): control is HTMLInputElement {
  return control instanceof HTMLInputElement && control.type === "radio";
}

function isChecked(control: HTMLElement): boolean {
  return control instanceof HTMLInputElement && control.checked;
}

function isValueControl(
  control: HTMLElement
): control is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  );
}

function requireNode(document: UnifoldIrDocument, id: string): UnifoldIrNode {
  const node = document.nodesById[id];
  if (node === undefined) throw hydrationError(`IR node is missing: ${id}.`);
  return node;
}

function requireElement(element: HTMLElement | undefined, id: string): HTMLElement {
  if (element === undefined) throw hydrationError(`Static node is missing: ${id}.`);
  return element;
}

function requiredAttribute(element: HTMLElement, attribute: string): string {
  const value = element.getAttribute(attribute);
  if (value === null) throw hydrationError(`Static attribute is missing: ${attribute}.`);
  return value;
}

function hydrationError(message: string): StaticDomHydrationError {
  return new StaticDomHydrationError(message);
}

import type { JsonValue } from "@unislang/unifold-contracts";
import {
  CoreComponentType,
  type UnifoldIrDocument,
  type UnifoldIrNode
} from "@unislang/unifold-ir";

const DOCUMENT_ATTRIBUTE = "data-unifold-static-document";
const NODE_ATTRIBUTE = "data-unifold-static-node-id";
const COMPONENT_ATTRIBUTE = "data-unifold-static-component";
const CONTROL_ATTRIBUTE = "data-unifold-static-control";

export interface StaticDomHydrationState {
  readonly focusedNodeId?: string;
  readonly values: Readonly<Record<string, JsonValue>>;
}

export class StaticDomHydrationError extends Error {}

export function captureStaticDomHydration(
  document: UnifoldIrDocument,
  container: HTMLElement
): StaticDomHydrationState {
  const root = requireStaticRoot(container, document.documentId);
  const elements = staticNodeElements(root);
  validateNodeSequence(document, elements);
  validateNodeHierarchy(document, elements);
  return {
    ...focusedNode(root),
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
  if (!valueComponents.has(node.componentType as CoreComponentType)) return;
  const controls = staticControls(element, id);
  if (controls.length === 0) return;
  const value = readControlValue(controls);
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

function readControlValue(controls: readonly HTMLElement[]): JsonValue {
  if (controls.every(isRadioInput)) return selectedRadioValue(controls);
  if (controls.length !== 1) throw hydrationError("Static control is duplicated.");
  return scalarControlValue(controls[0] as HTMLElement);
}

function selectedRadioValue(controls: readonly HTMLElement[]): string {
  const selected = controls.find(isChecked);
  if (selected === undefined) return "";
  return selected.getAttribute("value") ?? "";
}

function scalarControlValue(control: HTMLElement): JsonValue {
  if (isCheckboxInput(control)) return control.checked;
  if (isMultipleSelect(control)) return [...control.selectedOptions].map(({ value }) => value);
  return requiredScalarValue(control);
}

function requiredScalarValue(control: HTMLElement): string {
  if (isValueControl(control)) return control.value;
  throw hydrationError("Static control type is unsupported.");
}

function validateChoiceValue(node: UnifoldIrNode, value: JsonValue): void {
  if (!choiceComponents.has(node.componentType as CoreComponentType)) return;
  const allowed = optionValues(node);
  if (choiceValues(value).some((item) => isInvalidChoice(item, allowed)))
    throw hydrationError(`Static choice value is invalid: ${node.id}.`);
}

function choiceValues(value: JsonValue): readonly JsonValue[] {
  return Array.isArray(value) ? value : [value];
}

function isInvalidChoice(value: JsonValue, allowed: ReadonlySet<string>): boolean {
  if (typeof value !== "string") return true;
  if (value === "") return false;
  return !allowed.has(value);
}

const choiceComponents = new Set<CoreComponentType>([
  CoreComponentType.Combobox,
  CoreComponentType.MultiSelect,
  CoreComponentType.RadioGroup,
  CoreComponentType.Select
]);

const valueComponents = new Set<CoreComponentType>([
  CoreComponentType.Checkbox,
  CoreComponentType.Combobox,
  CoreComponentType.MultiSelect,
  CoreComponentType.RadioGroup,
  CoreComponentType.Select,
  CoreComponentType.TextArea,
  CoreComponentType.TextField
]);

function optionValues(node: UnifoldIrNode): ReadonlySet<string> {
  const options = node.properties["options"];
  if (!Array.isArray(options)) return new Set();
  return new Set(options.flatMap((option) => optionValue(option)));
}

function optionValue(option: JsonValue): readonly string[] {
  if (!isNonNullObject(option)) return [];
  if (Array.isArray(option)) return [];
  return stringList(option["value"]);
}

function stringList(value: JsonValue | undefined): readonly string[] {
  return typeof value === "string" ? [value] : [];
}

function isNonNullObject(value: JsonValue): value is Record<string, JsonValue> {
  if (value === null) return false;
  return typeof value === "object";
}

function focusedNode(root: HTMLElement): Pick<StaticDomHydrationState, "focusedNodeId"> {
  const active = root.ownerDocument.activeElement;
  if (active === null) return {};
  return focusedNodeWithinRoot(root, active);
}

function focusedNodeWithinRoot(
  root: HTMLElement,
  active: Element
): Pick<StaticDomHydrationState, "focusedNodeId"> {
  const node = active.closest<HTMLElement>(`[${NODE_ATTRIBUTE}]`);
  if (node === null) return {};
  if (!staticNodeElements(root).includes(node)) return {};
  return focusedNodeState(node);
}

function focusedNodeState(node: HTMLElement): Pick<StaticDomHydrationState, "focusedNodeId"> {
  const id = node.getAttribute(NODE_ATTRIBUTE);
  if (id === null) return {};
  return { focusedNodeId: id };
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

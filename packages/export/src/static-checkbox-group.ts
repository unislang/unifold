import { getCoreDescriptor, type ChoiceOption } from "@unislang/unifold-catalog";
import { CoreComponentType, DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";
import { staticNodeClassification } from "./static-classification.js";

interface StaticCheckboxGroupContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticCheckboxGroup({ document, node }: StaticCheckboxGroupContext): string {
  const selected = publicValue(document, node);
  const errorId = `${node.id}-error`;
  const options = optionList(node)
    .map((option, index) => renderOption(node, option, index, selected))
    .join("");
  const group = `<fieldset${attribute("aria-describedby", errorId)}${attribute(
    "aria-invalid",
    String(errorMessage(node).length > 0)
  )}${booleanAttribute(
    "disabled",
    booleanProperty(node, "disabled")
  )}><legend>${escapeHtml(stringProperty(node, "label"))}</legend>${options}</fieldset>`;
  return `${group}<span${attribute("id", errorId)} role="alert">${escapeHtml(
    errorMessage(node)
  )}</span>`;
}

function renderOption(
  node: UnifoldIrNode,
  option: ChoiceOption,
  index: number,
  selected: readonly string[]
): string {
  const id = `${node.id}__option_${index}`;
  return `<label${attribute("for", id)}><input${attribute(
    "data-unifold-static-control",
    node.id
  )}${attribute("id", id)} type="checkbox"${attribute(
    "name",
    stringProperty(node, "name")
  )}${attribute("value", option.value)}${booleanAttribute(
    "checked",
    option.disabled !== true && selected.includes(option.value)
  )}${booleanAttribute("disabled", option.disabled === true)}><span>${escapeHtml(
    option.label
  )}</span></label>`;
}

function publicValue(document: UnifoldIrDocument, node: UnifoldIrNode): readonly string[] {
  if (staticNodeClassification(document, node) !== DataClassification.Public) return [];
  const value = property(node, "value");
  return isStringArray(value) ? value : [];
}

function isStringArray(value: JsonValue | undefined): value is readonly string[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => typeof item === "string");
}

function optionList(node: UnifoldIrNode): readonly ChoiceOption[] {
  const value = property(node, "options");
  return Array.isArray(value) ? (value as unknown as readonly ChoiceOption[]) : [];
}

function errorMessage(node: UnifoldIrNode): string {
  return stringProperty(node, "errorMessage");
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function booleanProperty(node: UnifoldIrNode, name: string): boolean {
  return property(node, name) === true;
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  const descriptor = getCoreDescriptor(CoreComponentType.CheckboxGroup);
  if (descriptor === undefined) return undefined;
  return propertyDefault(descriptor.properties.find((item) => item.name === name));
}

function propertyDefault(
  descriptor: { readonly defaultValue?: JsonValue } | undefined
): JsonValue | undefined {
  if (descriptor === undefined) return undefined;
  return descriptor.defaultValue;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

import {
  getCoreDescriptor,
  type CatalogPropertyDescriptor,
  type ChoiceOption
} from "@unislang/unifold-catalog";
import { DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

const STATIC_OPTION_LIMIT = 200;

interface StaticVirtualListContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticVirtualList({ document, node }: StaticVirtualListContext): string {
  const options = publicOptions(document, node);
  const value = publicValue(document, node);
  const visible = staticOptions(options, value);
  const items = visible.map((option) => renderOption(option, options, value)).join("");
  const summary =
    options.length > visible.length ? `<p>${visible.length} of ${options.length} items</p>` : "";
  return `<div role="listbox"${attribute("aria-label", stringProperty(node, "label"))}>${items}</div>${summary}`;
}

function staticOptions(options: readonly ChoiceOption[], value: string): readonly ChoiceOption[] {
  const visible = options.slice(0, STATIC_OPTION_LIMIT);
  const selected = options.find((option) => option.value === value);
  if (selected === undefined || visible.includes(selected)) return visible;
  return [...visible, selected];
}

function renderOption(
  option: ChoiceOption,
  options: readonly ChoiceOption[],
  value: string
): string {
  const position = options.indexOf(option) + 1;
  return `<div role="option"${attribute("aria-posinset", String(position))}${attribute(
    "aria-setsize",
    String(options.length)
  )}${attribute("aria-selected", String(option.value === value))}${attribute(
    "aria-disabled",
    String(option.disabled === true)
  )}>${escapeHtml(option.label || `Item ${position}`)}</div>`;
}

function publicOptions(document: UnifoldIrDocument, node: UnifoldIrNode): readonly ChoiceOption[] {
  return classification(document, node) === DataClassification.Public ? optionList(node) : [];
}

function publicValue(document: UnifoldIrDocument, node: UnifoldIrNode): string {
  return classification(document, node) === DataClassification.Public
    ? stringProperty(node, "value")
    : "";
}

function classification(document: UnifoldIrDocument, node: UnifoldIrNode): DataClassification {
  if (node.binding === undefined) return DataClassification.Public;
  const store = document.storesById[node.binding.store];
  if (store === undefined) return DataClassification.NeverExport;
  return store.classification;
}

function optionList(node: UnifoldIrNode): readonly ChoiceOption[] {
  return property(node, "options") as readonly ChoiceOption[];
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  const descriptor = getCoreDescriptor(node.componentType);
  if (descriptor === undefined) return undefined;
  return defaultValue(descriptor.properties, name);
}

function defaultValue(
  properties: readonly CatalogPropertyDescriptor[],
  name: string
): JsonValue | undefined {
  return properties.find((item) => item.name === name)?.defaultValue;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

import { DateFieldAutocomplete } from "@unislang/unifold-catalog";
import { DataClassification, isJsonDateValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";
import { staticNodeClassification } from "./static-classification.js";

interface StaticDateFieldContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticDateField({ document, node }: StaticDateFieldContext): string {
  const input = `<input${attribute("data-unifold-static-control", node.id)} type="date"${attribute(
    "autocomplete",
    stringProperty(node, "autocomplete", DateFieldAutocomplete.Off)
  )}${attribute(
    "name",
    stringProperty(node, "name")
  )}${dateAttribute("min", node)}${dateAttribute("max", node)}${attribute(
    "step",
    String(numberProperty(node, "step", 1))
  )}${attribute("value", publicValue(document, node))}${booleanAttribute(
    "disabled",
    booleanProperty(node, "disabled")
  )}${booleanAttribute("readonly", booleanProperty(node, "readonly"))}${booleanAttribute(
    "required",
    booleanProperty(node, "required")
  )}>`;
  return `<label><span>${escapeHtml(stringProperty(node, "label"))}</span>${input}</label>${error(node)}`;
}

function publicValue(document: UnifoldIrDocument, node: UnifoldIrNode): string {
  if (staticNodeClassification(document, node) !== DataClassification.Public) return "";
  return canonicalDate(stringProperty(node, "value"));
}

function dateAttribute(name: string, node: UnifoldIrNode): string {
  const value = canonicalDate(stringProperty(node, name));
  return value === "" ? "" : attribute(name, value);
}

function canonicalDate(value: string): string {
  return isJsonDateValue(value) ? value : "";
}

function error(node: UnifoldIrNode): string {
  const message = stringProperty(node, "errorMessage");
  return message === "" ? "" : `<span role="alert">${escapeHtml(message)}</span>`;
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

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

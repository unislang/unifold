import { MAXIMUM_SEARCH_QUERY_LENGTH } from "@unislang/unifold-catalog";
import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";
import { staticNodeClassification } from "./static-classification.js";

interface StaticSearchFieldContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticSearchField({ document, node }: StaticSearchFieldContext): string {
  const input = `<input${attribute("data-unifold-static-control", node.id)} type="search"${attribute(
    "autocomplete",
    stringProperty(node, "autocomplete", "off")
  )} enterkeyhint="search"${attribute("name", stringProperty(node, "name"))}${attribute(
    "maxlength",
    String(numberProperty(node, "maxLength", MAXIMUM_SEARCH_QUERY_LENGTH))
  )}${attribute(
    "placeholder",
    stringProperty(node, "placeholder")
  )}${attribute("value", publicValue(document, node))}${booleanAttribute(
    "disabled",
    node.properties["disabled"] === true
  )}${booleanAttribute("readonly", node.properties["readonly"] === true)}${booleanAttribute(
    "required",
    node.properties["required"] === true
  )}>`;
  return `<label><span>${escapeHtml(stringProperty(node, "label"))}</span>${input}</label>${error(node)}`;
}

function publicValue(document: UnifoldIrDocument, node: UnifoldIrNode): string {
  if (staticNodeClassification(document, node) !== DataClassification.Public) return "";
  return stringProperty(node, "value");
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
  return typeof value === "number" ? value : fallback;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

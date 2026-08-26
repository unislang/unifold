import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";
import { staticNodeClassification } from "./static-classification.js";

interface StaticSwitchContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticSwitch({ document, node }: StaticSwitchContext): string {
  const errorId = `${node.id}-error`;
  const message = stringProperty(node, "errorMessage");
  const input = `<input${attribute("data-unifold-static-control", node.id)}${attribute(
    "aria-describedby",
    errorId
  )}${attribute("aria-invalid", String(message.length > 0))} type="checkbox" role="switch"${attribute(
    "name",
    stringProperty(node, "name")
  )}${booleanAttribute("checked", publicValue(document, node))}${booleanAttribute(
    "disabled",
    booleanProperty(node, "disabled")
  )}${booleanAttribute("required", booleanProperty(node, "required"))}>`;
  return `<label>${input}<span>${escapeHtml(stringProperty(node, "label"))}</span></label><span${attribute(
    "id",
    errorId
  )} role="alert">${escapeHtml(message)}</span>`;
}

function publicValue(document: UnifoldIrDocument, node: UnifoldIrNode): boolean {
  if (staticNodeClassification(document, node) !== DataClassification.Public) return false;
  return booleanProperty(node, "value");
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
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

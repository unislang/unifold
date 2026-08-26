import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticFileInputContext {
  readonly node: UnifoldIrNode;
}

export function renderStaticFileInput({ node }: StaticFileInputContext): string {
  const control = `<input${attribute("data-unifold-static-control", node.id)} type="file"${attribute(
    "accept",
    stringValue(node, "accept")
  )}${attribute("name", stringValue(node, "name"))}${booleanAttribute(
    "disabled",
    booleanValue(node, "disabled")
  )}${booleanAttribute("multiple", booleanValue(node, "multiple"))}${booleanAttribute(
    "required",
    booleanValue(node, "required")
  )}>`;
  return `<label><span>${text(node, "label")}</span>${control}</label>${error(node)}`;
}

function error(node: UnifoldIrNode): string {
  const message = stringValue(node, "errorMessage");
  return message === "" ? "" : `<span role="alert">${escapeHtml(message)}</span>`;
}

function text(node: UnifoldIrNode, name: string): string {
  return escapeHtml(stringValue(node, name));
}

function stringValue(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}

function booleanValue(node: UnifoldIrNode, name: string): boolean {
  return node.properties[name] === true;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

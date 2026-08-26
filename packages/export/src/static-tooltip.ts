import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

export function renderStaticTooltip({ node }: { readonly node: UnifoldIrNode }): string {
  const tooltipId = `${node.id}__tooltip`;
  return `<span${attribute("data-placement", stringProperty(node, "placement", "top"))}><button type="button"${attribute(
    "aria-describedby",
    tooltipId
  )}>${escapeHtml(stringProperty(node, "label"))}</button><span${attribute(
    "id",
    tooltipId
  )} role="tooltip">${escapeHtml(stringProperty(node, "content"))}</span></span>`;
}

function stringProperty(node: UnifoldIrNode, name: string, fallback = ""): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : fallback;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticPopoverContext {
  readonly children: string;
  readonly node: UnifoldIrNode;
}

export function renderStaticPopover({ children, node }: StaticPopoverContext): string {
  return `<details${attribute("data-placement", stringProperty(node, "placement", "bottom"))}><summary>${escapeHtml(
    stringProperty(node, "label")
  )}</summary><section role="dialog"${attribute(
    "aria-label",
    stringProperty(node, "panelLabel")
  )}>${children}</section></details>`;
}

function stringProperty(node: UnifoldIrNode, name: string, fallback = ""): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : fallback;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

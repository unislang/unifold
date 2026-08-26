import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticDialogContext {
  readonly children: string;
  readonly node: UnifoldIrNode;
}

export function renderStaticDialog({ children, node }: StaticDialogContext): string {
  return `<details><summary>${text(node, "label")}</summary><section role="dialog"${attribute(
    "aria-label",
    value(node, "dialogLabel")
  )}>${children}</section></details>`;
}

function text(node: UnifoldIrNode, name: string): string {
  return escapeHtml(value(node, name));
}

function value(node: UnifoldIrNode, name: string): string {
  const property = node.properties[name];
  return typeof property === "string" ? property : "";
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

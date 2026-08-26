import { type MenuItem } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticMenuContext {
  readonly node: UnifoldIrNode;
}

export function renderStaticMenuButton({ node }: StaticMenuContext): string {
  const items = (node.properties["items"] as unknown as readonly MenuItem[])
    .map((item) => renderItem(item))
    .join("");
  const inert = node.properties["disabled"] === true ? " inert" : "";
  return `<details${inert}><summary>${textProperty(node, "label")}</summary><ul>${items}</ul></details>`;
}

function renderItem(item: MenuItem): string {
  const disabled = item.disabled === true ? " disabled" : "";
  return `<li><button type="button"${disabled}>${escapeHtml(item.label)}</button></li>`;
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return escapeHtml(typeof value === "string" ? value : "");
}

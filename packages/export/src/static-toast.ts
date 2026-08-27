import { ToastStatus, ToastVariant } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

const urgentStatuses = new Set([ToastStatus.Warning, ToastStatus.Error]);

export function renderStaticToast(node: UnifoldIrNode): string {
  const status = enumProperty(node, "status", ToastStatus, ToastStatus.Info);
  const variant = enumProperty(node, "variant", ToastVariant, ToastVariant.Subtle);
  if (!booleanProperty(node, "visible", true)) return hiddenToast(node, status, variant);
  const role = urgentStatuses.has(status) ? "alert" : "status";
  return `<section${attribute("data-unifold-static-toast", node.id)}${attribute(
    "data-status",
    status
  )}${attribute("data-variant", variant)} data-visible="true"><div${attribute(
    "data-unifold-static-toast-announcement",
    node.id
  )}${attribute("role", role)} aria-atomic="true"><strong>${textProperty(
    node,
    "label"
  )}</strong><span>${textProperty(node, "message")}</span></div></section>`;
}

function hiddenToast(node: UnifoldIrNode, status: ToastStatus, variant: ToastVariant): string {
  return `<section${attribute("data-unifold-static-toast", node.id)}${attribute(
    "data-status",
    status
  )}${attribute("data-variant", variant)} data-visible="false" hidden></section>`;
}

function enumProperty<T extends string>(
  node: UnifoldIrNode,
  name: string,
  values: Readonly<Record<string, T>>,
  fallback: T
): T {
  const value = node.properties[name];
  return typeof value === "string" && Object.values(values).includes(value as T)
    ? (value as T)
    : fallback;
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return escapeHtml(typeof value === "string" ? value : "");
}

function booleanProperty(node: UnifoldIrNode, name: string, fallback: boolean): boolean {
  const value = node.properties[name];
  return typeof value === "boolean" ? value : fallback;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

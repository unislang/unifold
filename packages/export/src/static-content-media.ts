import { getCoreDescriptor, isSafeResourceUrl } from "@unislang/unifold-catalog";
import type { JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface ContentContext {
  readonly children: string;
  readonly node: UnifoldIrNode;
}

export function renderStaticCard({ children, node }: ContentContext): string {
  return `<article${optionalAttribute("aria-label", stringProperty(node, "label"))}>${children}</article>`;
}

export function renderStaticImage({ node }: Pick<ContentContext, "node">): string {
  const source = stringProperty(node, "src");
  const safeSource = isSafeResourceUrl(source) ? source : "";
  return `<img${optionalAttribute("src", safeSource)}${attribute(
    "alt",
    stringProperty(node, "alt")
  )}${attribute("width", String(positiveInteger(node, "width")))}${attribute(
    "height",
    String(positiveInteger(node, "height"))
  )}${attribute("loading", stringProperty(node, "loading"))} decoding="async"${attribute(
    "data-unifold-image-fit",
    stringProperty(node, "fit")
  )}>`;
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  return defaultProperty(node.componentType, name);
}

function defaultProperty(componentType: string, name: string): JsonValue | undefined {
  return getCoreDescriptor(componentType)?.properties.find((candidate) => candidate.name === name)
    ?.defaultValue;
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function positiveInteger(node: UnifoldIrNode, name: string): number {
  const value = property(node, name);
  return isPositiveInteger(value) ? value : 1;
}

function isPositiveInteger(value: JsonValue | undefined): value is number {
  return [typeof value === "number", Number.isSafeInteger(value), Number(value) > 0].every(Boolean);
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function optionalAttribute(name: string, value: string): string {
  return value === "" ? "" : attribute(name, value);
}

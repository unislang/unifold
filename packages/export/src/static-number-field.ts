import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";
import { staticNodeClassification } from "./static-classification.js";

interface StaticNumberFieldContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticNumberField({ document, node }: StaticNumberFieldContext): string {
  const value = publicValue(document, node);
  const input = `<input${attribute("data-unifold-static-control", node.id)} type="number"${attribute(
    "name",
    stringProperty(node, "name")
  )}${attribute("placeholder", stringProperty(node, "placeholder"))}${optionalNumberAttribute(
    "min",
    node.properties["min"]
  )}${optionalNumberAttribute("max", node.properties["max"])}${attribute(
    "step",
    String(numberProperty(node, "step", 1))
  )}${attribute("value", value === null ? "" : String(value))}${booleanAttribute(
    "disabled",
    node.properties["disabled"] === true
  )}${booleanAttribute("readonly", node.properties["readonly"] === true)}${booleanAttribute(
    "required",
    node.properties["required"] === true
  )}>`;
  return `<label><span>${escapeHtml(stringProperty(node, "label"))}</span>${input}</label>${error(node)}`;
}

function publicValue(document: UnifoldIrDocument, node: UnifoldIrNode): number | null {
  if (staticNodeClassification(document, node) !== DataClassification.Public) return null;
  return finiteNumber(node.properties["value"]);
}

function finiteNumber(value: unknown): number | null {
  return [typeof value === "number", Number.isFinite(Number(value))].every(Boolean)
    ? Number(value)
    : null;
}

function error(node: UnifoldIrNode): string {
  const message = stringProperty(node, "errorMessage");
  return message === "" ? "" : `<span role="alert">${escapeHtml(message)}</span>`;
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}

function numberProperty(node: UnifoldIrNode, name: string, fallback: number): number {
  const value = node.properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function optionalNumberAttribute(name: string, value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? attribute(name, String(value)) : "";
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

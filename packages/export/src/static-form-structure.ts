import { getCoreDescriptor, type ErrorSummaryItem } from "@unislang/unifold-catalog";
import { CoreComponentType, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface FormRenderContext {
  readonly children: string;
  readonly node: UnifoldIrNode;
}

export function renderStaticErrorSummary({ node }: FormRenderContext): string {
  const errors = errorSummaryItems(node);
  if (errors.length === 0) return "";
  const titleId = `${node.id}__title`;
  const items = errors.map(renderErrorLink).join("");
  return `<div role="alert" aria-live="polite"${attribute(
    "aria-labelledby",
    titleId
  )} tabindex="-1"><h2${attribute("id", titleId)}>${textProperty(
    node,
    "title"
  )}</h2><ul>${items}</ul></div>`;
}

export function renderStaticField({ children, node }: FormRenderContext): string {
  const label = stringProperty(node, "label");
  const help = stringProperty(node, "helpText");
  const error = stringProperty(node, "errorMessage");
  const labelId = `${node.id}__field-label`;
  const descriptions = fieldDescriptions(node, help, error);
  const labelText = booleanProperty(node, "required") ? `${label} (required)` : label;
  return `<div role="group"${optionalReference(
    "aria-labelledby",
    label,
    labelId
  )}${optionalReference("aria-describedby", descriptions, descriptions)}>${optionalText(
    "span",
    labelId,
    labelText
  )}${optionalText("p", `${node.id}__field-help`, help)}${children}${optionalAlert(
    `${node.id}__field-error`,
    error
  )}</div>`;
}

export function renderStaticFieldset({ children, node }: FormRenderContext): string {
  const help = stringProperty(node, "helpText");
  const helpId = `${node.id}__fieldset-help`;
  return `<fieldset${booleanAttribute(
    "disabled",
    booleanProperty(node, "disabled")
  )}${optionalReference("aria-describedby", help, helpId)}><legend>${textProperty(
    node,
    "label"
  )}</legend>${optionalText("p", helpId, help)}${children}</fieldset>`;
}

export function renderStaticForm({ children, node }: FormRenderContext): string {
  const label = stringProperty(node, "label");
  return `<form${attribute("aria-label", label)}><fieldset><legend>${escapeHtml(
    label
  )}</legend>${formErrors(node)}${children}</fieldset></form>`;
}

export function isErrorSummaryTarget(document: UnifoldIrDocument, nodeId: string): boolean {
  return document.renderOrder.some((id) => targetsNode(document.nodesById[id], nodeId));
}

function targetsNode(node: UnifoldIrNode | undefined, nodeId: string): boolean {
  if (node?.componentType !== CoreComponentType.ErrorSummary) return false;
  return errorSummaryItems(node).some((item) => item.targetId === nodeId);
}

function renderErrorLink({ message, targetId }: ErrorSummaryItem): string {
  return `<li><a${attribute("href", `#${targetId}`)}>${escapeHtml(message)}</a></li>`;
}

function formErrors(node: UnifoldIrNode): string {
  const errors = stringArrayProperty(node, "errorMessages");
  const items = errors.map((message) => `<li>${escapeHtml(message)}</li>`).join("");
  return errors.length === 0 ? "" : `<div role="alert"><ul>${items}</ul></div>`;
}

function fieldDescriptions(node: UnifoldIrNode, help: string, error: string): string {
  return [
    help === "" ? "" : `${node.id}__field-help`,
    error === "" ? "" : `${node.id}__field-error`
  ]
    .filter(Boolean)
    .join(" ");
}

function optionalAlert(id: string, value: string): string {
  return value === "" ? "" : `<p${attribute("id", id)} role="alert">${escapeHtml(value)}</p>`;
}

function optionalText(tag: "p" | "span", id: string, value: string): string {
  return value === "" ? "" : `<${tag}${attribute("id", id)}>${escapeHtml(value)}</${tag}>`;
}

function optionalReference(name: string, value: string, reference: string): string {
  return value === "" ? "" : attribute(name, reference);
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  return defaultProperty(node.componentType, name);
}

function defaultProperty(componentType: string, name: string): JsonValue | undefined {
  const descriptor = getCoreDescriptor(componentType);
  return descriptor?.properties.find((candidate) => candidate.name === name)?.defaultValue;
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function textProperty(node: UnifoldIrNode, name: string): string {
  return escapeHtml(stringProperty(node, name));
}

function booleanProperty(node: UnifoldIrNode, name: string): boolean {
  return property(node, name) === true;
}

function stringArrayProperty(node: UnifoldIrNode, name: string): readonly string[] {
  return property(node, name) as readonly string[];
}

function errorSummaryItems(node: UnifoldIrNode): readonly ErrorSummaryItem[] {
  return property(node, "errors") as unknown as readonly ErrorSummaryItem[];
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

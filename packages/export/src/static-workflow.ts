import { getCoreDescriptor, type WorkflowStep } from "@unislang/unifold-catalog";
import { DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticWorkflowContext {
  readonly childContent: readonly string[];
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticStepper(context: StaticWorkflowContext): string {
  const { document, node } = context;
  const { label, steps, value } = workflowSnapshot(document, node);
  return renderNavigation(node.id, label, steps, value);
}

export function renderStaticWizard(context: StaticWorkflowContext): string {
  const { childContent, document, node } = context;
  const { label, steps, value } = workflowSnapshot(document, node);
  const panels = childContent
    .map((content, index) => renderPanel(node.id, steps[index], index, value, content))
    .join("");
  return `<div>${renderNavigation(node.id, label, steps, value)}${panels}</div>`;
}

function renderNavigation(
  id: string,
  label: string,
  steps: readonly WorkflowStep[],
  value: string
) {
  const items = steps.map((step, index) => renderStep(id, step, index, value)).join("");
  return `<nav${attribute("aria-label", label)}><ol>${items}</ol></nav>`;
}

function renderStep(id: string, step: WorkflowStep, index: number, value: string): string {
  const current = step.id === value ? ' aria-current="step"' : "";
  const description =
    step.description === undefined ? "" : `<span>${escapeHtml(step.description)}</span>`;
  return `<li${attribute("id", stepId(id, index))}${current}><span>${index + 1}</span><strong>${escapeHtml(step.label)}</strong>${description}</li>`;
}

function renderPanel(
  id: string,
  step: WorkflowStep | undefined,
  index: number,
  value: string,
  content: string
): string {
  const current = workflowStepId(step) === value;
  const labelledBy = panelLabelId(step, id, index);
  return `<section role="region"${attribute("aria-labelledby", labelledBy)}${hiddenAttribute(current)}>${content}</section>`;
}

function stepId(id: string, index: number): string {
  return `${id}__step_${index}`;
}

function stepProperty(node: UnifoldIrNode): readonly WorkflowStep[] {
  return property(node, "steps") as unknown as readonly WorkflowStep[];
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  return defaultProperty(node, name);
}

function classification(document: UnifoldIrDocument, node: UnifoldIrNode): DataClassification {
  if (node.binding === undefined) return DataClassification.Public;
  return storeClassification(document.storesById[node.binding.store]);
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function workflowSnapshot(document: UnifoldIrDocument, node: UnifoldIrNode) {
  if (classification(document, node) !== DataClassification.Public) {
    return { label: "", steps: [], value: "" };
  }
  return {
    label: textProperty(node, "label"),
    steps: stepProperty(node),
    value: textProperty(node, "value")
  };
}

function workflowStepId(step: WorkflowStep | undefined): string | undefined {
  return step?.id;
}

function panelLabelId(step: WorkflowStep | undefined, id: string, index: number): string {
  return step === undefined ? "" : stepId(id, index);
}

function hiddenAttribute(current: boolean): string {
  return current ? "" : " hidden";
}

function defaultProperty(node: UnifoldIrNode, name: string): JsonValue | undefined {
  return getCoreDescriptor(node.componentType)?.properties.find(
    (candidate) => candidate.name === name
  )?.defaultValue;
}

function storeClassification(
  store: UnifoldIrDocument["storesById"][string] | undefined
): DataClassification {
  return store?.classification ?? DataClassification.NeverExport;
}

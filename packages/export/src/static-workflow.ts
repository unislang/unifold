import { getCoreDescriptor, type TabItem, type WorkflowStep } from "@unislang/unifold-catalog";
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

export function renderStaticTabs(context: StaticWorkflowContext): string {
  const { childContent, document, node } = context;
  const { label, tabs, value } = tabSnapshot(document, node);
  const tabList = tabs.map((tab, index) => renderTab(node.id, tab, index, value)).join("");
  const panels = childContent
    .map((content, index) => renderTabPanel(node.id, tabs[index], index, value, content))
    .join("");
  return `<div>${staticValue(node.id, value)}<div role="tablist"${attribute(
    "aria-label",
    label
  )}${attribute("aria-orientation", textProperty(node, "orientation"))}>${tabList}</div>${panels}</div>`;
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

function renderTab(id: string, tab: TabItem, index: number, value: string): string {
  const selected = tab.id === value;
  return `<button type="button" role="tab"${attribute("id", tabId(id, index))}${attribute(
    "aria-controls",
    tabPanelId(id, index)
  )}${attribute("aria-selected", String(selected))} tabindex="-1" disabled>${escapeHtml(
    tab.label
  )}</button>`;
}

function renderTabPanel(
  id: string,
  tab: TabItem | undefined,
  index: number,
  value: string,
  content: string
): string {
  const selected = tab?.id === value;
  return `<section role="tabpanel"${attribute("id", tabPanelId(id, index))}${attribute(
    "aria-labelledby",
    tabId(id, index)
  )}${hiddenAttribute(selected)}>${content}</section>`;
}

function stepId(id: string, index: number): string {
  return `${id}__step_${index}`;
}

function stepProperty(node: UnifoldIrNode): readonly WorkflowStep[] {
  return property(node, "steps") as unknown as readonly WorkflowStep[];
}

function tabProperty(node: UnifoldIrNode): readonly TabItem[] {
  return property(node, "tabs") as unknown as readonly TabItem[];
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

function tabSnapshot(document: UnifoldIrDocument, node: UnifoldIrNode) {
  if (classification(document, node) !== DataClassification.Public) {
    return { label: "", tabs: [], value: "" };
  }
  return {
    label: textProperty(node, "label"),
    tabs: tabProperty(node),
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

function tabId(id: string, index: number): string {
  return `${id}__tab_${index}`;
}

function tabPanelId(id: string, index: number): string {
  return `${id}__tabpanel_${index}`;
}

function staticValue(id: string, value: string): string {
  return `<input type="hidden"${attribute("data-unifold-static-control", id)}${attribute(
    "value",
    value
  )}>`;
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

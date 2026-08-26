import {
  ErrorSummaryItemProperty,
  MAXIMUM_ERROR_SUMMARY_ITEMS,
  type ErrorSummaryItem
} from "@unislang/unifold-catalog";
import { CoreComponentType, UiNodeKind } from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { nodeKindForComponent } from "./node-kind.js";
import type { CompilerDiagnostic } from "./types.js";

const itemKeys = new Set<string>(Object.values(ErrorSummaryItemProperty));
const MAXIMUM_ERROR_MESSAGE_LENGTH = 4_096;

export function isErrorSummaryItemList(value: unknown): value is readonly ErrorSummaryItem[] {
  if (!Array.isArray(value) || value.length > MAXIMUM_ERROR_SUMMARY_ITEMS) return false;
  return value.every(isErrorSummaryItem);
}

export function validateErrorSummaryTargets(
  view: unknown,
  nodeComponents: ReadonlyMap<string, string>,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  visitNode(view, "/view", nodeComponents, nodeIds, diagnostics);
}

function visitNode(
  value: unknown,
  path: string,
  nodeComponents: ReadonlyMap<string, string>,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!isPlainObject(value)) return;
  validateNode(value, path, nodeComponents, nodeIds, diagnostics);
  visitChildren(value["$children"], path, nodeComponents, nodeIds, diagnostics);
}

function validateNode(
  node: Readonly<Record<string, unknown>>,
  path: string,
  nodeComponents: ReadonlyMap<string, string>,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (node["$comp"] !== CoreComponentType.ErrorSummary) return;
  validateItems(node, path, nodeComponents, nodeIds, diagnostics);
}

function visitChildren(
  children: unknown,
  path: string,
  nodeComponents: ReadonlyMap<string, string>,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!Array.isArray(children)) return;
  children.forEach((child, index) =>
    visitNode(child, `${path}/$children/${index}`, nodeComponents, nodeIds, diagnostics)
  );
}

function validateItems(
  node: Readonly<Record<string, unknown>>,
  path: string,
  nodeComponents: ReadonlyMap<string, string>,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  const items = node["errors"];
  if (!isErrorSummaryItemList(items)) return;
  items.forEach((item, index) =>
    validateTarget(
      item.targetId,
      `${path}/errors/${index}/targetId`,
      node,
      nodeComponents,
      nodeIds,
      diagnostics
    )
  );
}

function validateTarget(
  targetId: string,
  path: string,
  node: Readonly<Record<string, unknown>>,
  nodeComponents: ReadonlyMap<string, string>,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!nodeIds.has(targetId)) return addUnknownTarget(targetId, path, node, diagnostics);
  if (!isInteractiveControl(nodeComponents.get(targetId)))
    addInvalidTarget(targetId, path, node, diagnostics);
}

function isInteractiveControl(componentType: string | undefined): boolean {
  if (componentType === undefined) return false;
  return nodeKindForComponent(componentType) === UiNodeKind.Control;
}

function addUnknownTarget(
  targetId: string,
  path: string,
  node: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnknownErrorSummaryTarget,
      `Error summary target "${targetId}" is not a document node.`,
      path,
      nodeId(node)
    )
  );
}

function addInvalidTarget(
  targetId: string,
  path: string,
  node: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidErrorSummaryTarget,
      `Error summary target "${targetId}" is not an interactive control.`,
      path,
      nodeId(node)
    )
  );
}

function isErrorSummaryItem(value: unknown): value is ErrorSummaryItem {
  if (!isPlainObject(value)) return false;
  return hasValidItemFields(value) && hasKnownItemKeys(value);
}

function hasValidItemFields(value: Readonly<Record<string, unknown>>): boolean {
  return (
    isValidMessage(value[ErrorSummaryItemProperty.Message]) &&
    isNonEmptyString(value[ErrorSummaryItemProperty.TargetId])
  );
}

function isValidMessage(value: unknown): boolean {
  return (
    typeof value === "string" && value.length > 0 && value.length <= MAXIMUM_ERROR_MESSAGE_LENGTH
  );
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function hasKnownItemKeys(value: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(value).every((key) => itemKeys.has(key));
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}

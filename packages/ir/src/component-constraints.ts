import {
  CatalogConstraintKind,
  type CatalogChildCountConstraint,
  type CatalogConstraintDescriptor,
  type CatalogSelectionInOptionsConstraint,
  type CatalogUniqueOptionValuesConstraint,
  type ChoiceOption,
  type ComponentDescriptor
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { validateAuditLogDataConstraint } from "./audit-log-validation.js";
import { validateBreadcrumbDataConstraint } from "./breadcrumb-validation.js";
import { validateDataGridStateConstraint } from "./data-grid-validation.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { validateMasterDetailStateConstraint } from "./master-detail-validation.js";
import { validateSearchResultsStateConstraint } from "./search-results-validation.js";
import { validateStepNavigationStateConstraint } from "./step-navigation-validation.js";
import type { CompilerDiagnostic } from "./types.js";
import { validateTableDataConstraint } from "./table-data-validation.js";

type ConstraintValidator = (
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
) => void;

interface SelectionEntry {
  readonly path: string;
  readonly value: string;
}

const validators: Readonly<Record<CatalogConstraintKind, ConstraintValidator>> = {
  [CatalogConstraintKind.AuditLogData]: validateAuditLogDataConstraint,
  [CatalogConstraintKind.BreadcrumbData]: validateBreadcrumbDataConstraint,
  [CatalogConstraintKind.ChildCount]: validateChildCount,
  [CatalogConstraintKind.DataGridState]: validateDataGridStateConstraint,
  [CatalogConstraintKind.MasterDetailState]: validateMasterDetailStateConstraint,
  [CatalogConstraintKind.SearchResultsState]: validateSearchResultsStateConstraint,
  [CatalogConstraintKind.SelectionInOptions]: validateSelectionInOptions,
  [CatalogConstraintKind.StepNavigationState]: validateStepNavigationStateConstraint,
  [CatalogConstraintKind.TableData]: validateTableDataConstraint,
  [CatalogConstraintKind.UniqueOptionValues]: validateUniqueOptionValues
};

function validateChildCount(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (descriptor.kind !== CatalogConstraintKind.ChildCount) return;
  validateTypedChildCount(node, descriptor, path, diagnostics);
}

function validateTypedChildCount(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogChildCountConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const count = childCount(node["$children"]);
  if (count === undefined) return;
  if (outsideChildRange(count, descriptor))
    addChildCountDiagnostic(count, descriptor, nodeId(node), path, diagnostics);
}

function childCount(value: unknown): number | undefined {
  if (value === undefined) return 0;
  return Array.isArray(value) ? value.length : undefined;
}

function outsideChildRange(count: number, descriptor: CatalogChildCountConstraint): boolean {
  return count < descriptor.minimum || count > descriptor.maximum;
}

function addChildCountDiagnostic(
  count: number,
  descriptor: CatalogChildCountConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidChildCount,
      `Component requires ${descriptor.minimum} to ${descriptor.maximum} children; received ${count}.`,
      `${path}/$children`,
      id
    )
  );
}

export function validateComponentConstraints(
  node: Readonly<Record<string, unknown>>,
  descriptor: ComponentDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  descriptor.constraints?.forEach((constraint) => {
    validators[constraint.kind](node, constraint, path, diagnostics);
  });
}

function validateUniqueOptionValues(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (descriptor.kind !== CatalogConstraintKind.UniqueOptionValues) return;
  const options = readOptions(node[descriptor.optionsProperty]);
  if (options === undefined) return;
  reportDuplicateOptions(options, descriptor, nodeId(node), path, diagnostics);
}

function reportDuplicateOptions(
  options: readonly ChoiceOption[],
  descriptor: CatalogUniqueOptionValuesConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const seen = new Set<string>();
  options.forEach((option, index) => {
    if (seen.has(option.value))
      addDuplicateDiagnostic(option.value, index, descriptor, id, path, diagnostics);
    seen.add(option.value);
  });
}

function addDuplicateDiagnostic(
  value: string,
  index: number,
  descriptor: CatalogUniqueOptionValuesConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.DuplicateOptionValue,
      `Option value "${value}" is already defined.`,
      `${path}/${descriptor.optionsProperty}/${index}/value`,
      id
    )
  );
}

function validateSelectionInOptions(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (descriptor.kind !== CatalogConstraintKind.SelectionInOptions) return;
  validateSelectionConstraint(node, descriptor, path, diagnostics);
}

function validateSelectionConstraint(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogSelectionInOptionsConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const options = readOptions(node[descriptor.optionsProperty]);
  const selections = readSelections(node[descriptor.selectionProperty], descriptor, path);
  if (options === undefined) return;
  if (selections === undefined) return;
  reportUnknownSelections(options, selections, nodeId(node), diagnostics);
}

function reportUnknownSelections(
  options: readonly ChoiceOption[],
  selections: readonly SelectionEntry[],
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const values = new Set(options.map(({ value }) => value));
  selections.forEach((selection) => {
    if (!values.has(selection.value)) addUnknownDiagnostic(selection, id, diagnostics);
  });
}

function addUnknownDiagnostic(
  selection: SelectionEntry,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnknownOptionSelection,
      `Selected value "${selection.value}" is not declared in the options.`,
      selection.path,
      id
    )
  );
}

function readOptions(value: unknown): readonly ChoiceOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every(isChoiceOption)) return undefined;
  return value;
}

function isChoiceOption(value: unknown): value is ChoiceOption {
  if (!isPlainObject(value)) return false;
  return typeof value["label"] === "string" && typeof value["value"] === "string";
}

function readSelections(
  value: unknown,
  descriptor: CatalogSelectionInOptionsConstraint,
  path: string
): readonly SelectionEntry[] | undefined {
  const selectionPath = `${path}/${descriptor.selectionProperty}`;
  if (value === undefined) return [];
  if (typeof value === "string") return readScalarSelection(value, descriptor, selectionPath);
  return readArraySelections(value, selectionPath);
}

function readScalarSelection(
  value: string,
  descriptor: CatalogSelectionInOptionsConstraint,
  path: string
): readonly SelectionEntry[] {
  if (descriptor.allowEmptySelection && value.length === 0) return [];
  return [{ path, value }];
}

function readArraySelections(value: unknown, path: string): readonly SelectionEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === "string")) return undefined;
  return value.map((item, index) => ({ path: `${path}/${index}`, value: item }));
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}

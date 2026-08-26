import {
  CatalogPropertyType,
  MAXIMUM_MENU_ITEMS,
  getCoreDescriptor,
  isSafeUrl,
  type CatalogPropertyDescriptor
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { isAuditLogEntryList } from "./audit-log-validation.js";
import { isDataGridValue } from "./data-grid-validation.js";
import { validateComponentConstraints } from "./component-constraints.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";
import { isTableColumnList, isTableIdentifier, isTableRowList } from "./table-data-validation.js";
import { isSearchResultList, isSearchResultsValue } from "./search-results-validation.js";
import { isWorkflowStepList } from "./step-navigation-validation.js";

type PropertyValidator = (value: unknown, descriptor: CatalogPropertyDescriptor) => boolean;

const reservedProperties = new Set(["$children", "$comp", "id", "path", "store"]);
const optionKeys = new Set(["disabled", "label", "value"]);
const validators: Readonly<Record<CatalogPropertyType, PropertyValidator>> = {
  [CatalogPropertyType.AuditLogEntryList]: isAuditLogEntryList,
  [CatalogPropertyType.Boolean]: (value) => typeof value === "boolean",
  [CatalogPropertyType.DataGridValue]: isDataGridValue,
  [CatalogPropertyType.Enum]: isEnumValue,
  [CatalogPropertyType.MenuItemList]: isMenuItemList,
  [CatalogPropertyType.OptionList]: isOptionList,
  [CatalogPropertyType.PositiveInteger]: (value) =>
    typeof value === "number" && Number.isInteger(value) && value > 0,
  [CatalogPropertyType.SafeUrl]: (value) => typeof value === "string" && isSafeUrl(value),
  [CatalogPropertyType.SearchResultList]: isSearchResultList,
  [CatalogPropertyType.SearchResultsValue]: isSearchResultsValue,
  [CatalogPropertyType.StepId]: (value) => isTableIdentifier(value),
  [CatalogPropertyType.StepList]: isWorkflowStepList,
  [CatalogPropertyType.String]: (value) => typeof value === "string",
  [CatalogPropertyType.StringArray]: isStringArray,
  [CatalogPropertyType.TableColumnList]: isTableColumnList,
  [CatalogPropertyType.TableRowList]: isTableRowList
};

export function validateNodeProperties(
  node: Readonly<Record<string, unknown>>,
  component: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const descriptor = getCoreDescriptor(component ?? "");
  if (descriptor === undefined) return;
  const properties = new Map(descriptor.properties.map((property) => [property.name, property]));
  Object.entries(node).forEach(([name, value]) => {
    if (!reservedProperties.has(name)) validateProperty(name, value, path, properties, diagnostics);
  });
  descriptor.properties.forEach((property) => {
    if (property.required && node[property.name] === undefined) {
      diagnostics.push(propertyDiagnostic(DiagnosticCode.MissingRequiredProperty, property, path));
    }
  });
  validateComponentConstraints(node, descriptor, path, diagnostics);
}

function validateProperty(
  name: string,
  value: unknown,
  path: string,
  properties: ReadonlyMap<string, CatalogPropertyDescriptor>,
  diagnostics: CompilerDiagnostic[]
): void {
  const descriptor = properties.get(name);
  if (descriptor === undefined) {
    diagnostics.push(unknownPropertyDiagnostic(name, path));
    return;
  }
  if (!validators[descriptor.valueType](value, descriptor)) {
    diagnostics.push(propertyDiagnostic(DiagnosticCode.InvalidProperty, descriptor, path));
  }
}

function isEnumValue(value: unknown, descriptor: CatalogPropertyDescriptor): boolean {
  if (typeof value !== "string") return false;
  return descriptor.enumValues?.includes(value) === true;
}

function isStringArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item) => typeof item === "string");
}

function isOptionList(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every(isChoiceOption);
}

function isMenuItemList(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (!isMenuItemCount(value.length)) return false;
  return value.every(isChoiceOption);
}

function isMenuItemCount(count: number): boolean {
  return count >= 1 && count <= MAXIMUM_MENU_ITEMS;
}

function isChoiceOption(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return [
    typeof value["label"] === "string",
    typeof value["value"] === "string",
    validDisabled(value["disabled"]),
    Object.keys(value).every((key) => optionKeys.has(key))
  ].every(Boolean);
}

function validDisabled(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function unknownPropertyDiagnostic(name: string, path: string): CompilerDiagnostic {
  return errorDiagnostic(
    DiagnosticCode.UnsupportedProperty,
    `Property "${name}" is not declared by the component catalog.`,
    `${path}/${name}`
  );
}

function propertyDiagnostic(
  code: DiagnosticCode,
  descriptor: CatalogPropertyDescriptor,
  path: string
): CompilerDiagnostic {
  return errorDiagnostic(
    code,
    `Property "${descriptor.name}" must be ${descriptor.valueType}.`,
    `${path}/${descriptor.name}`
  );
}

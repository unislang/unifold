import { CoreComponentType } from "@unislang/unifold-ir";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { validateStaticPagination } from "./pagination-hydration.js";
import { validateStaticToast } from "./toast-hydration.js";

type StructureValidator = (node: UnifoldIrNode, element: HTMLElement, invalid: () => Error) => void;

const structureValidators: Partial<Record<CoreComponentType, StructureValidator>> = {
  [CoreComponentType.Pagination]: validateStaticPagination,
  [CoreComponentType.Toast]: validateStaticToast
};

const choiceComponents = new Set<CoreComponentType>([
  CoreComponentType.CheckboxGroup,
  CoreComponentType.Combobox,
  CoreComponentType.MultiSelect,
  CoreComponentType.RadioGroup,
  CoreComponentType.Select,
  CoreComponentType.Tabs
]);

const valueComponents = new Set<CoreComponentType>([
  CoreComponentType.Checkbox,
  CoreComponentType.CheckboxGroup,
  CoreComponentType.Combobox,
  CoreComponentType.DateField,
  CoreComponentType.MultiSelect,
  CoreComponentType.NumberField,
  CoreComponentType.RadioGroup,
  CoreComponentType.SearchField,
  CoreComponentType.Select,
  CoreComponentType.Switch,
  CoreComponentType.Tabs,
  CoreComponentType.TextArea,
  CoreComponentType.TextField
]);

export function isStaticChoiceComponent(value: string): boolean {
  return choiceComponents.has(value as CoreComponentType);
}

export function isStaticValueComponent(value: string): boolean {
  return valueComponents.has(value as CoreComponentType);
}

export function validateStaticStructure(
  node: UnifoldIrNode,
  element: HTMLElement,
  invalid: () => Error
): void {
  structureValidators[node.componentType as CoreComponentType]?.(node, element, invalid);
}

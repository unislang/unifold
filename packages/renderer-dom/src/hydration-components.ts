import { CoreComponentType } from "@unislang/unifold-ir";

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

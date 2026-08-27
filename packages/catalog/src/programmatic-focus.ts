import { CoreComponentType } from "@unislang/unifold-contracts";

export enum ComponentProgrammaticFocusBehavior {
  FirstFocusableDescendant = "first-focusable-descendant",
  None = "none"
}

const behaviors = {
  [CoreComponentType.Accordion]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Alert]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.AuditLog]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Box]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Breadcrumb]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Button]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Card]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Checkbox]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.CheckboxGroup]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Combobox]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Composition]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.DataGrid]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.DateField]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Dialog]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.ErrorSummary]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Field]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Fieldset]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.FileInput]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Form]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Grid]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Heading]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Icon]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Image]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Link]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.MasterDetail]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.MenuButton]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.MultiSelect]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.NumberField]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Pagination]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Popover]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.RadioGroup]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.SearchField]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.SearchResults]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Select]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Stack]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Stepper]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Switch]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Table]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Tabs]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Text]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.TextArea]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.TextField]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Toast]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.Tooltip]: ComponentProgrammaticFocusBehavior.None,
  [CoreComponentType.VirtualList]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant,
  [CoreComponentType.Wizard]: ComponentProgrammaticFocusBehavior.FirstFocusableDescendant
} as const satisfies Readonly<Record<CoreComponentType, ComponentProgrammaticFocusBehavior>>;

export function componentProgrammaticFocusBehavior(
  componentType: string
): ComponentProgrammaticFocusBehavior {
  if (!Object.hasOwn(behaviors, componentType)) return ComponentProgrammaticFocusBehavior.None;
  return behaviors[componentType as CoreComponentType];
}

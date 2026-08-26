import { CoreComponentType, UiComponentEventBinding } from "@unislang/unifold-contracts";

const NONE: readonly UiComponentEventBinding[] = Object.freeze([]);
const ACTIVATED = Object.freeze([UiComponentEventBinding.Activated]);
const INPUT = Object.freeze([UiComponentEventBinding.Input]);
const INPUT_AND_BLUR = Object.freeze([
  UiComponentEventBinding.Input,
  UiComponentEventBinding.Blurred
]);
const FORM = Object.freeze([
  UiComponentEventBinding.ResetRequested,
  UiComponentEventBinding.SubmitRequested,
  UiComponentEventBinding.Submitted
]);

const EVENTS: Readonly<Record<CoreComponentType, readonly UiComponentEventBinding[]>> = {
  [CoreComponentType.Accordion]: INPUT,
  [CoreComponentType.Alert]: NONE,
  [CoreComponentType.AuditLog]: NONE,
  [CoreComponentType.Box]: NONE,
  [CoreComponentType.Breadcrumb]: ACTIVATED,
  [CoreComponentType.Button]: ACTIVATED,
  [CoreComponentType.Card]: NONE,
  [CoreComponentType.Checkbox]: INPUT_AND_BLUR,
  [CoreComponentType.Combobox]: INPUT_AND_BLUR,
  [CoreComponentType.Composition]: NONE,
  [CoreComponentType.DataGrid]: INPUT_AND_BLUR,
  [CoreComponentType.Dialog]: ACTIVATED,
  [CoreComponentType.ErrorSummary]: ACTIVATED,
  [CoreComponentType.Field]: NONE,
  [CoreComponentType.Fieldset]: NONE,
  [CoreComponentType.FileInput]: INPUT_AND_BLUR,
  [CoreComponentType.Form]: FORM,
  [CoreComponentType.Grid]: NONE,
  [CoreComponentType.Heading]: NONE,
  [CoreComponentType.Icon]: NONE,
  [CoreComponentType.Image]: NONE,
  [CoreComponentType.Link]: ACTIVATED,
  [CoreComponentType.MasterDetail]: INPUT_AND_BLUR,
  [CoreComponentType.MenuButton]: ACTIVATED,
  [CoreComponentType.MultiSelect]: INPUT_AND_BLUR,
  [CoreComponentType.NumberField]: INPUT_AND_BLUR,
  [CoreComponentType.Popover]: ACTIVATED,
  [CoreComponentType.RadioGroup]: INPUT_AND_BLUR,
  [CoreComponentType.SearchField]: INPUT_AND_BLUR,
  [CoreComponentType.SearchResults]: INPUT_AND_BLUR,
  [CoreComponentType.Select]: INPUT_AND_BLUR,
  [CoreComponentType.Stack]: NONE,
  [CoreComponentType.Stepper]: INPUT_AND_BLUR,
  [CoreComponentType.Tabs]: INPUT_AND_BLUR,
  [CoreComponentType.Table]: NONE,
  [CoreComponentType.Text]: NONE,
  [CoreComponentType.TextArea]: INPUT_AND_BLUR,
  [CoreComponentType.TextField]: INPUT_AND_BLUR,
  [CoreComponentType.Tooltip]: NONE,
  [CoreComponentType.VirtualList]: INPUT,
  [CoreComponentType.Wizard]: Object.freeze([
    UiComponentEventBinding.Activated,
    UiComponentEventBinding.Input
  ])
};

export function getCoreComponentEvents(component: string): readonly UiComponentEventBinding[] {
  return EVENTS[component as CoreComponentType] ?? NONE;
}

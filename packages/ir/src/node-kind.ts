import { CoreComponentType, UiNodeKind } from "@unislang/unifold-contracts";

const NODE_KINDS: Readonly<Record<CoreComponentType, UiNodeKind>> = {
  [CoreComponentType.Accordion]: UiNodeKind.Control,
  [CoreComponentType.Alert]: UiNodeKind.Component,
  [CoreComponentType.AuditLog]: UiNodeKind.Component,
  [CoreComponentType.Box]: UiNodeKind.Component,
  [CoreComponentType.Button]: UiNodeKind.Component,
  [CoreComponentType.Checkbox]: UiNodeKind.Control,
  [CoreComponentType.Combobox]: UiNodeKind.Control,
  [CoreComponentType.Composition]: UiNodeKind.Composition,
  [CoreComponentType.DataGrid]: UiNodeKind.Control,
  [CoreComponentType.Form]: UiNodeKind.Form,
  [CoreComponentType.Grid]: UiNodeKind.Component,
  [CoreComponentType.Heading]: UiNodeKind.Component,
  [CoreComponentType.Icon]: UiNodeKind.Component,
  [CoreComponentType.Link]: UiNodeKind.Component,
  [CoreComponentType.MasterDetail]: UiNodeKind.Control,
  [CoreComponentType.MultiSelect]: UiNodeKind.Control,
  [CoreComponentType.RadioGroup]: UiNodeKind.Control,
  [CoreComponentType.SearchResults]: UiNodeKind.Control,
  [CoreComponentType.Select]: UiNodeKind.Control,
  [CoreComponentType.Stack]: UiNodeKind.Component,
  [CoreComponentType.Stepper]: UiNodeKind.Control,
  [CoreComponentType.Table]: UiNodeKind.Component,
  [CoreComponentType.Text]: UiNodeKind.Component,
  [CoreComponentType.TextArea]: UiNodeKind.Control,
  [CoreComponentType.TextField]: UiNodeKind.Control,
  [CoreComponentType.VirtualList]: UiNodeKind.Control,
  [CoreComponentType.Wizard]: UiNodeKind.Control
};

export function nodeKindForComponent(componentType: string): UiNodeKind | undefined {
  return NODE_KINDS[componentType as CoreComponentType];
}

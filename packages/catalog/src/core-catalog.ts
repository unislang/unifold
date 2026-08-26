import {
  CoreCatalogName,
  CoreCatalogVersion,
  CoreComponentType,
  UiUpdateTrigger,
  type JsonValue
} from "@unislang/unifold-contracts";
import {
  AlertTone,
  ButtonAction,
  ButtonVariant,
  CatalogBindingKind,
  CatalogPropertyType,
  CoreElementTag,
  HeadingLevel,
  IconName,
  IconSize,
  IconTone,
  LayoutAlignment,
  LayoutSpace,
  LinkTarget,
  StackDirection,
  SurfaceTone,
  TextSize,
  TextTone,
  TextWeight,
  TextAreaWrap,
  TextFieldInputType
} from "./enums.js";
import type { CatalogPropertyDescriptor, ComponentCatalog, ComponentDescriptor } from "./types.js";
import * as dataViews from "./data-view-catalog.js";
import * as workflows from "./workflow-catalog.js";
import { choiceConstraints, choiceProperties, comboboxDescriptor } from "./choice-catalog.js";
import { menuButtonDescriptor } from "./menu-catalog.js";
import { tooltipDescriptor } from "./tooltip-catalog.js";
const property = (
  name: string,
  valueType: CatalogPropertyType,
  defaultValue?: JsonValue
): CatalogPropertyDescriptor => {
  const descriptor = {
    bindingKind: CatalogBindingKind.Property,
    bindingName: name,
    name,
    required: false,
    valueType
  };
  return defaultValue === undefined ? descriptor : { ...descriptor, defaultValue };
};

function requiredProperty(name: string, valueType: CatalogPropertyType): CatalogPropertyDescriptor {
  return { ...property(name, valueType), required: true };
}

function requiredEnumProperty(name: string, values: readonly string[]): CatalogPropertyDescriptor {
  return { ...requiredProperty(name, CatalogPropertyType.Enum), enumValues: values };
}

const testId: CatalogPropertyDescriptor = {
  bindingKind: CatalogBindingKind.Attribute,
  bindingName: "data-testid",
  name: "testId",
  required: false,
  valueType: CatalogPropertyType.String
};

function enumProperty(
  name: string,
  defaultValue: string,
  values: readonly string[]
): CatalogPropertyDescriptor {
  return { ...property(name, CatalogPropertyType.Enum, defaultValue), enumValues: values };
}

function textControlProperties(
  specific: readonly CatalogPropertyDescriptor[]
): readonly CatalogPropertyDescriptor[] {
  return [
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("label", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    property("placeholder", CatalogPropertyType.String, ""),
    property("readonly", CatalogPropertyType.Boolean, false),
    property("required", CatalogPropertyType.Boolean, false),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("value", CatalogPropertyType.String, ""),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    ...specific,
    testId
  ];
}

function layoutProperties(
  specific: readonly CatalogPropertyDescriptor[]
): readonly CatalogPropertyDescriptor[] {
  return [property("label", CatalogPropertyType.String, ""), ...specific, testId];
}

const descriptors: Record<CoreComponentType, ComponentDescriptor> = {
  [CoreComponentType.Accordion]: {
    componentType: CoreComponentType.Accordion,
    properties: [
      property("disabled", CatalogPropertyType.Boolean, false),
      property("label", CatalogPropertyType.String, ""),
      property("name", CatalogPropertyType.String, ""),
      enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
      property("value", CatalogPropertyType.Boolean, false),
      property("validators", CatalogPropertyType.StringArray, []),
      property("asyncValidators", CatalogPropertyType.StringArray, []),
      testId
    ],
    tagName: CoreElementTag.Accordion,
    version: "1.0.0"
  },
  [CoreComponentType.Alert]: {
    componentType: CoreComponentType.Alert,
    properties: [
      property("content", CatalogPropertyType.String, ""),
      property("title", CatalogPropertyType.String, ""),
      enumProperty("tone", AlertTone.Info, Object.values(AlertTone)),
      testId
    ],
    tagName: CoreElementTag.Alert,
    version: "1.0.0"
  },
  [CoreComponentType.AuditLog]: dataViews.auditLogDescriptor,
  [CoreComponentType.Box]: {
    componentType: CoreComponentType.Box,
    properties: layoutProperties([
      enumProperty("padding", LayoutSpace.Medium, Object.values(LayoutSpace)),
      enumProperty("surface", SurfaceTone.Transparent, Object.values(SurfaceTone))
    ]),
    tagName: CoreElementTag.Box,
    version: "1.0.0"
  },
  [CoreComponentType.Button]: {
    componentType: CoreComponentType.Button,
    properties: [
      property("disabled", CatalogPropertyType.Boolean, false),
      property("label", CatalogPropertyType.String, ""),
      enumProperty("action", ButtonAction.Button, Object.values(ButtonAction)),
      enumProperty("variant", ButtonVariant.Primary, Object.values(ButtonVariant)),
      testId
    ],
    tagName: CoreElementTag.Button,
    version: "1.0.0"
  },
  [CoreComponentType.Checkbox]: {
    componentType: CoreComponentType.Checkbox,
    properties: [
      property("disabled", CatalogPropertyType.Boolean, false),
      property("errorMessage", CatalogPropertyType.String, ""),
      property("label", CatalogPropertyType.String, ""),
      property("name", CatalogPropertyType.String, ""),
      property("required", CatalogPropertyType.Boolean, false),
      enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
      property("value", CatalogPropertyType.Boolean, false),
      property("validators", CatalogPropertyType.StringArray, []),
      property("asyncValidators", CatalogPropertyType.StringArray, []),
      testId
    ],
    tagName: CoreElementTag.Checkbox,
    version: "1.0.0"
  },
  [CoreComponentType.Combobox]: comboboxDescriptor,
  [CoreComponentType.Composition]: {
    componentType: CoreComponentType.Composition,
    properties: [property("label", CatalogPropertyType.String, ""), testId],
    tagName: CoreElementTag.Composition,
    version: "1.0.0"
  },
  [CoreComponentType.DataGrid]: dataViews.dataGridDescriptor,
  [CoreComponentType.Form]: {
    componentType: CoreComponentType.Form,
    properties: [
      property("errorMessages", CatalogPropertyType.StringArray, []),
      property("label", CatalogPropertyType.String, ""),
      property("validators", CatalogPropertyType.StringArray, []),
      property("asyncValidators", CatalogPropertyType.StringArray, []),
      testId
    ],
    tagName: CoreElementTag.Form,
    version: "1.0.0"
  },
  [CoreComponentType.Grid]: {
    componentType: CoreComponentType.Grid,
    properties: layoutProperties([
      property("columns", CatalogPropertyType.PositiveInteger, 1),
      enumProperty("gap", LayoutSpace.Medium, Object.values(LayoutSpace))
    ]),
    tagName: CoreElementTag.Grid,
    version: "1.0.0"
  },
  [CoreComponentType.Heading]: {
    componentType: CoreComponentType.Heading,
    properties: [
      property("content", CatalogPropertyType.String, ""),
      enumProperty("level", HeadingLevel.Two, Object.values(HeadingLevel)),
      enumProperty("tone", TextTone.Default, Object.values(TextTone)),
      testId
    ],
    tagName: CoreElementTag.Heading,
    version: "1.0.0"
  },
  [CoreComponentType.Icon]: {
    componentType: CoreComponentType.Icon,
    properties: [
      property("label", CatalogPropertyType.String, ""),
      requiredEnumProperty("name", Object.values(IconName)),
      enumProperty("size", IconSize.Medium, Object.values(IconSize)),
      enumProperty("tone", IconTone.Default, Object.values(IconTone)),
      testId
    ],
    tagName: CoreElementTag.Icon,
    version: "1.0.0"
  },
  [CoreComponentType.Link]: {
    componentType: CoreComponentType.Link,
    properties: [
      requiredProperty("href", CatalogPropertyType.SafeUrl),
      property("label", CatalogPropertyType.String, ""),
      enumProperty("target", LinkTarget.Self, Object.values(LinkTarget)),
      testId
    ],
    tagName: CoreElementTag.Link,
    version: "1.0.0"
  },
  [CoreComponentType.MasterDetail]: dataViews.masterDetailDescriptor,
  [CoreComponentType.MenuButton]: menuButtonDescriptor,
  [CoreComponentType.MultiSelect]: {
    componentType: CoreComponentType.MultiSelect,
    constraints: choiceConstraints,
    properties: choiceProperties(CatalogPropertyType.StringArray, []),
    tagName: CoreElementTag.MultiSelect,
    version: "1.0.0"
  },
  [CoreComponentType.RadioGroup]: {
    componentType: CoreComponentType.RadioGroup,
    constraints: choiceConstraints,
    properties: choiceProperties(CatalogPropertyType.String, ""),
    tagName: CoreElementTag.RadioGroup,
    version: "1.0.0"
  },
  [CoreComponentType.SearchResults]: dataViews.searchResultsDescriptor,
  [CoreComponentType.Select]: {
    componentType: CoreComponentType.Select,
    constraints: choiceConstraints,
    properties: choiceProperties(CatalogPropertyType.String, ""),
    tagName: CoreElementTag.Select,
    version: "1.0.0"
  },
  [CoreComponentType.Stack]: {
    componentType: CoreComponentType.Stack,
    properties: layoutProperties([
      enumProperty("align", LayoutAlignment.Stretch, Object.values(LayoutAlignment)),
      enumProperty("direction", StackDirection.Vertical, Object.values(StackDirection)),
      enumProperty("gap", LayoutSpace.Medium, Object.values(LayoutSpace))
    ]),
    tagName: CoreElementTag.Stack,
    version: "1.0.0"
  },
  [CoreComponentType.Stepper]: workflows.stepperDescriptor,
  [CoreComponentType.Tabs]: workflows.tabsDescriptor,
  [CoreComponentType.Table]: dataViews.tableDescriptor,
  [CoreComponentType.Text]: {
    componentType: CoreComponentType.Text,
    properties: [
      property("content", CatalogPropertyType.String, ""),
      enumProperty("size", TextSize.Medium, Object.values(TextSize)),
      enumProperty("tone", TextTone.Default, Object.values(TextTone)),
      enumProperty("weight", TextWeight.Normal, Object.values(TextWeight)),
      testId
    ],
    tagName: CoreElementTag.Text,
    version: "1.0.0"
  },
  [CoreComponentType.TextArea]: {
    componentType: CoreComponentType.TextArea,
    properties: textControlProperties([
      property("rows", CatalogPropertyType.PositiveInteger, 4),
      enumProperty("wrap", TextAreaWrap.Soft, Object.values(TextAreaWrap))
    ]),
    tagName: CoreElementTag.TextArea,
    version: "1.0.0"
  },
  [CoreComponentType.TextField]: {
    componentType: CoreComponentType.TextField,
    properties: textControlProperties([
      enumProperty("inputType", TextFieldInputType.Text, Object.values(TextFieldInputType))
    ]),
    tagName: CoreElementTag.TextField,
    version: "1.0.0"
  },
  [CoreComponentType.Tooltip]: tooltipDescriptor,
  [CoreComponentType.VirtualList]: {
    componentType: CoreComponentType.VirtualList,
    constraints: choiceConstraints,
    properties: [
      ...choiceProperties(CatalogPropertyType.String, ""),
      property("itemHeight", CatalogPropertyType.PositiveInteger, 40),
      property("overscan", CatalogPropertyType.PositiveInteger, 4),
      property("viewportHeight", CatalogPropertyType.PositiveInteger, 400)
    ],
    tagName: CoreElementTag.VirtualList,
    version: "1.0.0"
  },
  [CoreComponentType.Wizard]: workflows.wizardDescriptor
};

export const coreCatalog: ComponentCatalog = Object.freeze({
  components: Object.freeze(descriptors),
  name: CoreCatalogName.UnifoldCore,
  version: CoreCatalogVersion.Version1
});

export function getCoreDescriptor(type: string): ComponentDescriptor | undefined {
  return descriptors[type as CoreComponentType];
}

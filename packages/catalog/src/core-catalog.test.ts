import { describe, expect, it } from "vitest";

import {
  AlertTone,
  CatalogPropertyType,
  CatalogConstraintKind,
  CoreCatalogMajor,
  CoreCatalogName,
  CoreCatalogVersion,
  CoreComponentType,
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
  TextFieldInputType,
  TextAreaWrap,
  coreCatalog,
  getCoreDescriptor
} from "./index.js";

describe("coreCatalog", () => {
  it("pins a coherent enum-backed identity", () => {
    expect(coreCatalog).toMatchObject({
      name: CoreCatalogName.UnifoldCore,
      version: CoreCatalogVersion.Version1
    });
    expect(coreCatalog.version.split(".")[0]).toBe(CoreCatalogMajor.Version1);
  });

  it("describes every component in the initial compiler vocabulary", () => {
    expect(Object.keys(coreCatalog.components).sort()).toEqual(
      Object.values(CoreComponentType).sort()
    );
  });

  it("publishes finite enum values for text input types", () => {
    const descriptor = getCoreDescriptor(CoreComponentType.TextField);
    if (descriptor === undefined) throw new Error("TextField descriptor is missing.");
    const inputType = descriptor.properties.find(({ name }) => name === "inputType");
    if (inputType === undefined) throw new Error("inputType property is missing.");

    expect(inputType.valueType).toBe(CatalogPropertyType.Enum);
    expect(inputType.enumValues).toEqual(Object.values(TextFieldInputType));
  });

  it("describes the reusable composition boundary", () => {
    const descriptor = getCoreDescriptor(CoreComponentType.Composition);

    expect(descriptor).toMatchObject({
      componentType: CoreComponentType.Composition,
      tagName: CoreElementTag.Composition
    });
    expect(descriptor?.properties.map(({ name }) => name)).toEqual(["label", "testId"]);
  });
});

it("publishes finite TextArea wrap values and positive rows", () => {
  const descriptor = getCoreDescriptor(CoreComponentType.TextArea);
  const rows = descriptor?.properties.find(({ name }) => name === "rows");
  const wrap = descriptor?.properties.find(({ name }) => name === "wrap");

  expect(rows).toMatchObject({ defaultValue: 4, valueType: CatalogPropertyType.PositiveInteger });
  expect(wrap).toMatchObject({ enumValues: Object.values(TextAreaWrap) });
});

it("publishes finite layout primitives with safe defaults", () => {
  expect(propertyDefault(CoreComponentType.Box, "padding")).toBe(LayoutSpace.Medium);
  expect(propertyDefault(CoreComponentType.Box, "surface")).toBe(SurfaceTone.Transparent);
  expect(propertyDefault(CoreComponentType.Stack, "align")).toBe(LayoutAlignment.Stretch);
  expect(propertyDefault(CoreComponentType.Stack, "direction")).toBe(StackDirection.Vertical);
  expect(propertyDefault(CoreComponentType.Grid, "columns")).toBe(1);
});

it("bounds the virtual-list window with finite geometry defaults", () => {
  expect(propertyDefault(CoreComponentType.VirtualList, "itemHeight")).toBe(40);
  expect(propertyDefault(CoreComponentType.VirtualList, "overscan")).toBe(4);
  expect(propertyDefault(CoreComponentType.VirtualList, "viewportHeight")).toBe(400);
});

it("publishes enum-backed semantic content defaults", () => {
  expect(propertyDefault(CoreComponentType.Alert, "tone")).toBe(AlertTone.Info);
  expect(propertyDefault(CoreComponentType.Heading, "level")).toBe(HeadingLevel.Two);
  expect(propertyDefault(CoreComponentType.Link, "target")).toBe(LinkTarget.Self);
  expect(propertyDefault(CoreComponentType.Text, "size")).toBe(TextSize.Medium);
  expect(propertyDefault(CoreComponentType.Text, "tone")).toBe(TextTone.Default);
  expect(propertyDefault(CoreComponentType.Text, "weight")).toBe(TextWeight.Normal);
});

it("requires an allowlisted Icon name with token-backed presentation", () => {
  const descriptor = getCoreDescriptor(CoreComponentType.Icon);
  const name = descriptor?.properties.find((property) => property.name === "name");
  expect(name).toMatchObject({
    enumValues: Object.values(IconName),
    required: true,
    valueType: CatalogPropertyType.Enum
  });
  expect(propertyDefault(CoreComponentType.Icon, "size")).toBe(IconSize.Medium);
  expect(propertyDefault(CoreComponentType.Icon, "tone")).toBe(IconTone.Default);
});

function propertyDefault(type: CoreComponentType, name: string) {
  return getCoreDescriptor(type)?.properties.find((property) => property.name === name)
    ?.defaultValue;
}

describe("Form catalog descriptor", () => {
  it("allows forms to declare aggregate validators", () => {
    const descriptor = getCoreDescriptor(CoreComponentType.Form);
    const validators = descriptor?.properties.find(({ name }) => name === "validators");

    expect(validators).toMatchObject({
      defaultValue: [],
      valueType: CatalogPropertyType.StringArray
    });
  });
});

describe("choice catalog descriptors", () => {
  it("declare reusable option uniqueness and membership constraints", () => {
    [
      CoreComponentType.Combobox,
      CoreComponentType.Select,
      CoreComponentType.MultiSelect,
      CoreComponentType.RadioGroup,
      CoreComponentType.VirtualList
    ].forEach((type) => {
      expect(getCoreDescriptor(type)?.constraints?.map(({ kind }) => kind)).toEqual([
        CatalogConstraintKind.UniqueOptionValues,
        CatalogConstraintKind.SelectionInOptions
      ]);
    });
  });
});

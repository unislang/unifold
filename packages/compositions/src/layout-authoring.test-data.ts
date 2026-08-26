import type { JsonValue } from "@unislang/unifold-contracts";

type MutableJsonObject = Record<string, JsonValue>;

interface LayoutFixture extends Record<string, unknown> {
  layoutVersion: string;
  readonly layouts: [
    {
      readonly layoutType: string;
      readonly template: MutableJsonObject;
      readonly variables: MutableJsonObject;
      readonly version: string;
    }
  ];
  readonly variables: MutableJsonObject & {
    readonly fields: MutableJsonObject[];
  };
}

export function layoutDocument(): LayoutFixture {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "contact-page",
    layoutType: "form-section",
    layoutVersion: "1.0.0",
    layouts: [layoutDefinition()],
    revision: "revision-1",
    schemaVersion: "1.0.0",
    variables: {
      fields: layoutFields(),
      heading: "Contact form"
    }
  } as unknown as LayoutFixture;
}

export function expectedLoweredView() {
  return {
    $children: [
      {
        $comp: "TextField",
        events: { input: "FORM_FIELD_CHANGE" },
        id: "name",
        label: "Name",
        required: true
      },
      {
        $comp: "Button",
        events: { activated: "FORM_SUBMIT" },
        id: "save",
        label: "Save"
      }
    ],
    $comp: "Stack",
    id: "root",
    label: "Contact form"
  };
}

export function configureRepeatedActions(source: LayoutFixture): void {
  source.layouts[0].variables["showActions"] = { required: true, type: "boolean" };
  source.layouts[0].variables["actions"] = { required: true, type: "array" };
  source.variables["showActions"] = true;
  source.variables["actions"] = [
    { id: "edit", label: "Edit" },
    { id: "archive", label: "Archive" }
  ];
  source.layouts[0].template["children"] = [
    {
      for: "action in {{actions}}",
      id: "action",
      if: "{{showActions}}",
      key: "id",
      props: { label: "{{action.label}}" },
      type: "Button"
    }
  ];
}

function layoutDefinition() {
  return {
    layoutType: "form-section",
    template: {
      children: { $var: "fields" },
      id: "root",
      props: { label: "{{heading}}" },
      type: "Stack"
    },
    variables: {
      fields: { required: true, type: "nodes" },
      heading: { required: true, type: "string" }
    },
    version: "1.0.0"
  };
}

function layoutFields(): MutableJsonObject[] {
  return [
    {
      events: { onInput: "FORM_FIELD_CHANGE" },
      id: "name",
      props: { label: "Name", required: true },
      type: "TextField"
    },
    {
      events: { onClick: "FORM_SUBMIT" },
      id: "save",
      props: { label: "Save" },
      type: "Button"
    }
  ];
}

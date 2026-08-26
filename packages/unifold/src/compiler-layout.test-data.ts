export function layoutDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "contact-page",
    layoutType: "form-section",
    layoutVersion: "1.0.0",
    layouts: [layoutDefinition()],
    revision: "1",
    schemaVersion: "1.0.0",
    variables: {
      fields: layoutFields(),
      heading: "Contact form"
    }
  };
}

function layoutDefinition() {
  return {
    layoutType: "form-section",
    template: {
      children: { $var: "fields" },
      id: "page",
      props: { label: { $var: "heading" } },
      type: "Stack"
    },
    variables: {
      fields: { required: true, type: "nodes" },
      heading: { required: true, type: "string" }
    },
    version: "1.0.0"
  };
}

function layoutFields() {
  return [
    { id: "name", props: { label: "Name" }, type: "TextField" },
    {
      events: { onClick: "FORM_SUBMIT" },
      id: "save",
      props: { label: "Save" },
      type: "Button"
    }
  ];
}

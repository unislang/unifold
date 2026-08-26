export const hierarchicalLayoutDocument = {
  $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
  catalog: { name: "unifold-core", version: "1.0.0" },
  id: "profile-reference",
  layoutType: "details-page",
  layoutVersion: "1.0.0",
  layouts: [
    {
      layoutType: "details-page",
      template: {
        children: [
          {
            children: { $var: "fields" },
            id: "layout-form",
            props: { label: "Details form" },
            type: "Form"
          }
        ],
        id: "layout-page",
        props: { label: { $var: "heading" } },
        type: "Stack"
      },
      variables: {
        fields: { required: true, type: "nodes" },
        heading: { required: true, type: "string" }
      },
      version: "1.0.0"
    }
  ],
  machines: [
    {
      id: "details-workflow",
      initial: "closed",
      ownerId: "layout-form",
      schemaVersion: "1.0.0",
      states: {
        closed: {
          on: { DETAILS_OPEN: { commands: ["show-layout-details"], target: "open" } }
        },
        open: {}
      },
      version: "1.0.0"
    }
  ],
  revision: "layout-1",
  schemaVersion: "1.0.0",
  variables: {
    fields: [
      {
        children: [
          {
            events: { onClick: "DETAILS_OPEN" },
            id: "layout-details",
            props: { label: "Show details" },
            type: "Button"
          },
          {
            id: "layout-status",
            props: { content: "Details closed" },
            type: "Text"
          }
        ],
        id: "layout-actions",
        type: "Stack"
      }
    ],
    heading: "Hierarchical details"
  }
};

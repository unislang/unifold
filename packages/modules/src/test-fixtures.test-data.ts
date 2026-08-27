import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiControlNodeKind,
  UiControlTopologyVersion,
  UiSchemaVersion
} from "@unislang/unifold-contracts";
import { CompositionContractVersion } from "@unislang/unifold-compositions";

import {
  UiModuleResourceKind,
  UiModuleSchemaUri,
  UiModuleSchemaVersion,
  type UiModule
} from "./types.js";

export function moduleFixture(overrides: Partial<UiModule> = {}): UiModule {
  return {
    $schema: UiModuleSchemaUri.Version1,
    exports: {
      compositions: [],
      documents: [{ document: documentFixture(), name: "application" }],
      resources: [{ id: "welcome", kind: UiModuleResourceKind.Message, value: "Welcome" }]
    },
    id: "org.example.root",
    imports: [],
    schemaVersion: UiModuleSchemaVersion.Version1,
    version: "1.0.0",
    ...overrides
  };
}

export function sharedModuleFixture(): UiModule {
  return moduleFixture({
    exports: {
      compositions: [fieldComposition()],
      documents: [],
      resources: [{ id: "label", kind: UiModuleResourceKind.Message, value: "Shared label" }]
    },
    id: "org.example.shared"
  });
}

export function layoutModuleFixture(): UiModule {
  return moduleFixture({
    exports: {
      compositions: [],
      documents: [],
      resources: [
        {
          id: "profile-page",
          kind: UiModuleResourceKind.Layout,
          value: layoutDefinitionFixture("profile-page", "Imported module layout")
        }
      ]
    },
    id: "org.example.layouts"
  });
}

export function layoutDefinitionFixture(layoutType: string, message: string) {
  return {
    layoutType,
    template: {
      id: "message",
      props: { content: "{{message}}" },
      type: "Text"
    },
    variables: { message: { default: message, required: false, type: "string" } },
    version: "1.0.0"
  };
}

function documentFixture() {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    id: "module-application",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "revision-1",
    schemaVersion: UiSchemaVersion.Version1,
    view: { $comp: "Text", id: "message", text: "Module application" }
  };
}

export function composedDocumentFixture() {
  return {
    ...documentFixture(),
    view: {
      $version: "1.0.0",
      $compose: "shared/profile-field",
      id: "profile"
    }
  };
}

export function layoutDocumentFixture() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    id: "module-layout-application",
    layoutType: "module-page",
    layoutVersion: "1.0.0",
    layouts: [
      {
        layoutType: "module-page",
        template: {
          id: "message",
          props: { content: "{{message}}" },
          type: "Text"
        },
        variables: { message: { required: true, type: "string" } },
        version: "1.0.0"
      }
    ],
    revision: "revision-1",
    schemaVersion: UiSchemaVersion.Version1,
    variables: { message: "Scratch-style module application" }
  };
}

export function collectionLayoutDocumentFixture() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "form", kind: UiControlNodeKind.Form },
        { id: "items", key: "items", kind: UiControlNodeKind.Array, parentId: "form" }
      ]
    },
    id: "module-collection-application",
    layoutType: "collection-page",
    layoutVersion: "1.0.0",
    layouts: [collectionLayoutDefinition()],
    revision: "revision-1",
    schemaVersion: UiSchemaVersion.Version1,
    variables: { items: [] }
  };
}

function collectionLayoutDefinition() {
  return {
    layoutType: "collection-page",
    template: {
      children: [
        {
          children: [
            {
              collection: "items",
              emptyFocusTarget: "add-item",
              for: "item in {{items}}",
              id: "item",
              key: "id",
              props: { label: "{{item.label}}", value: "{{item.label}}" },
              type: "TextField"
            }
          ],
          id: "items",
          type: "Stack"
        },
        { id: "add-item", props: { label: "Add item" }, type: "Button" }
      ],
      id: "form",
      type: "Form"
    },
    variables: { items: { required: true, type: "array" } },
    version: "1.0.0"
  };
}

function fieldComposition() {
  return {
    contractVersion: CompositionContractVersion.Version1,
    exports: {},
    name: "profile-field",
    parameters: {},
    slots: [],
    template: {
      $children: [{ $comp: "TextField", id: "name", label: "Name", value: "" }],
      $comp: "Composition",
      id: "root"
    },
    version: "1.0.0"
  };
}

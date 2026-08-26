import {
  CoreCatalogName,
  CoreCatalogVersion,
  DataClassification,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind,
  type JsonObject
} from "@unislang/unifold-contracts";
import {
  prepareUnifoldDocument,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument
} from "@unislang/unifold";

import { referenceAuditLogNode } from "./static-audit-log-reference.test-data.js";
import { referenceSearchResultsNode } from "./static-search-results-reference.test-data.js";
import { largeVirtualListNode } from "./static-virtual-list-reference.test-data.js";
import {
  referenceStepperNode,
  referenceTabsNode,
  referenceWizardNode
} from "./static-workflow-reference.test-data.js";

export function completeStaticDocument(): JsonObject {
  return documentWithView(referenceRoot());
}

export function largeVirtualListDocument(): JsonObject {
  return documentWithView(largeVirtualListNode());
}

export function classifiedVirtualListDocument(classification: DataClassification): JsonObject {
  return {
    ...documentWithView({ ...virtualList(), path: "/name", store: "profile" }),
    stores: [storeDefinition(classification)]
  };
}

function referenceRoot(): JsonObject {
  return {
    $comp: "Composition",
    id: "root",
    label: "Reference",
    $children: [referenceForm(), referenceDisclosure(), referenceTabsNode()]
  };
}

function referenceForm(): JsonObject {
  return {
    $comp: "Form",
    id: "form",
    label: "Profile",
    errorMessages: ["Correct the highlighted field"],
    $children: [
      textField(),
      passwordField(),
      textArea(),
      checkbox(),
      radioGroup(),
      selectNode("Combobox", "assignee", "Assignee", "email"),
      selectNode("Select", "country", "Country", "us"),
      selectNode("MultiSelect", "skills", "Skills", ["ts"]),
      virtualList(),
      referenceAuditLogNode(),
      tableNode(),
      dataGridNode(),
      masterDetailNode(),
      referenceSearchResultsNode(),
      referenceStepperNode(),
      referenceWizardNode(),
      { $comp: "Button", action: "submit", id: "save", label: "Save" }
    ]
  };
}

function textArea(): JsonObject {
  return {
    $comp: "TextArea",
    id: "biography",
    label: "Biography",
    name: "biography",
    rows: 3,
    value: "A pioneer",
    wrap: "soft"
  };
}

function checkbox(): JsonObject {
  return {
    $comp: "Checkbox",
    id: "newsletter",
    label: "Newsletter",
    name: "newsletter",
    value: true
  };
}

function referenceDisclosure(): JsonObject {
  return {
    $comp: "Accordion",
    id: "help",
    label: "Help",
    value: true,
    $children: [{ $comp: "Box", id: "box", label: "Resources", $children: [referenceStack()] }]
  };
}

function referenceStack(): JsonObject {
  return {
    $comp: "Stack",
    id: "stack",
    $children: [
      { $comp: "Icon", id: "icon", label: "Information", name: "info" },
      { $comp: "Heading", content: "Support", id: "heading", level: "2" },
      { $comp: "Text", content: "Read the guide", id: "copy" },
      { $comp: "Alert", content: "Context retained", id: "alert", title: "Ready" },
      { $comp: "Link", href: "https://unifold.org/docs", id: "link", label: "Documentation" },
      referenceGrid()
    ]
  };
}

function referenceGrid(): JsonObject {
  return {
    $comp: "Grid",
    columns: 2,
    id: "grid",
    $children: [{ $comp: "Button", id: "secondary", label: "Cancel" }]
  };
}

export function semanticDocument(
  classification: DataClassification = DataClassification.Public,
  value = "Ada"
): JsonObject {
  return {
    ...documentWithView({ ...textField(), path: "/name", store: "profile", value }),
    semantics: semanticGraph(value),
    stores: [storeDefinition(classification)]
  };
}

export function maliciousStaticDocument(payload: string): JsonObject {
  return {
    ...documentWithView({
      $comp: "Stack",
      id: `root-${payload}`,
      label: payload,
      $children: [{ $comp: "Text", content: payload, id: "unsafe-copy" }]
    }),
    id: `document-${payload}`,
    semantics: constantSemanticGraph(payload)
  };
}

export function prepareTestDocument(document: JsonObject): PreparedUnifoldDocument {
  const result = prepareUnifoldDocument(document);
  if (result.status !== UnifoldPreparationStatus.Valid || result.prepared === undefined) {
    throw new Error(`Test document is invalid: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.prepared;
}

export function documentWithView(view: JsonObject): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "static-test",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "revision-1",
    schemaVersion: UiSchemaVersion.Version1,
    view
  };
}

function textField(): JsonObject {
  return {
    $comp: "TextField",
    id: "name",
    errorMessage: "Name is required",
    inputType: "text",
    label: "Name",
    name: "name",
    required: true,
    value: "Ada"
  };
}

function passwordField(): JsonObject {
  return {
    $comp: "TextField",
    id: "password",
    inputType: "password",
    label: "Password",
    name: "password",
    value: "must-not-export"
  };
}

function radioGroup(): JsonObject {
  return {
    $comp: "RadioGroup",
    id: "contact",
    label: "Contact",
    name: "contact",
    options: choiceOptions(),
    value: "email"
  };
}

function selectNode(
  component: "Combobox" | "MultiSelect" | "Select",
  id: string,
  label: string,
  value: string | readonly string[]
): JsonObject {
  return { $comp: component, id, label, name: id, options: choiceOptions(), value };
}

function virtualList(): JsonObject {
  return {
    $comp: "VirtualList",
    id: "records",
    label: "Records",
    options: choiceOptions(),
    value: "email"
  };
}

function tableNode(): JsonObject {
  return {
    $comp: "Table",
    caption: "People",
    columns: [
      { key: "name", label: "Name" },
      { key: "active", label: "Active" }
    ],
    id: "people",
    rows: [
      { cells: { active: true, name: "Ada" }, id: "ada" },
      { cells: { active: false, name: "<strong>Grace</strong>" }, id: "grace" }
    ]
  };
}

function dataGridNode(): JsonObject {
  return {
    $comp: "DataGrid",
    caption: "Selectable people",
    columns: [{ key: "name", label: "Name" }],
    id: "people-grid",
    rows: [{ cells: { name: "Ada" }, id: "ada-grid" }],
    selectionMode: "single",
    sortableColumns: ["name"],
    value: { selectedRowIds: [] }
  };
}

function masterDetailNode(): JsonObject {
  return {
    $comp: "MasterDetail",
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" }
    ],
    detailLabel: "Person details",
    id: "people-master-detail",
    label: "People",
    masterColumn: "name",
    rows: [{ cells: { name: "Ada", status: "Active" }, id: "ada-master" }],
    value: "ada-master"
  };
}

function choiceOptions(): readonly JsonObject[] {
  return [
    { label: "Email", value: "email" },
    { disabled: true, label: "TypeScript", value: "ts" },
    { label: "United States", value: "us" }
  ];
}

function semanticGraph(value: string): JsonObject {
  return {
    contractVersion: "1.0.0",
    entities: [
      {
        id: "urn:unifold:person",
        properties: {
          description: { kind: "constant", value },
          name: { kind: "node-control-value", nodeId: "name" }
        },
        type: "Person"
      }
    ],
    primaryEntity: "urn:unifold:person",
    publication: { mode: "public-page", profile: "schema.org" },
    vocabulary: { release: "30.0", uri: "https://schema.org" }
  };
}

function constantSemanticGraph(value: string): JsonObject {
  const graph = semanticGraph(value);
  return {
    ...graph,
    entities: [
      {
        id: "urn:unifold:person",
        properties: { description: { kind: "constant", value } },
        type: "Person"
      }
    ]
  };
}

function storeDefinition(classification: DataClassification): JsonObject {
  return {
    access: UiStoreAccess.ReadOnly,
    classification,
    id: "profile",
    initialData: UiStoreInitialDataPolicy.Optional,
    maxBytes: 1024,
    migrations: { maximum: "1.0.0", minimum: "1.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Memory,
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { name: { type: "string" } },
      required: ["name"],
      type: "object"
    },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}

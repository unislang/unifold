import {
  CoreCatalogName,
  CoreCatalogVersion,
  DataClassification,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import {
  prepareUnifoldDocument,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument
} from "@unislang/unifold";

import { referenceBreadcrumbNode } from "./static-breadcrumb-reference.test-data.js";
import { referenceDialogNode } from "./static-dialog-reference.test-data.js";
import {
  referenceStaticForm,
  referenceTextFieldNode,
  referenceVirtualListNode
} from "./static-form-reference.test-data.js";
import { referenceMenuButton } from "./static-menu-reference.test-data.js";
import { referenceTooltipNode } from "./static-tooltip-reference.test-data.js";
import { referenceStoreDefinition } from "./static-store-reference.test-data.js";
import { largeVirtualListNode } from "./static-virtual-list-reference.test-data.js";
import { referenceTabsNode } from "./static-workflow-reference.test-data.js";

export function completeStaticDocument(): JsonObject {
  return documentWithView(referenceRoot());
}

export const largeVirtualListDocument = (): JsonObject => documentWithView(largeVirtualListNode());

export function classifiedVirtualListDocument(classification: DataClassification): JsonObject {
  return {
    ...documentWithView({ ...referenceVirtualListNode(), path: "/name", store: "profile" }),
    stores: [referenceStoreDefinition(classification)]
  };
}

function referenceRoot(): JsonObject {
  return {
    $comp: "Composition",
    id: "root",
    label: "Reference",
    $children: [
      referenceStaticForm(),
      referenceContentMedia(),
      referenceDisclosure(),
      referenceBreadcrumbNode(),
      referenceMenuButton(),
      referencePopover(),
      referenceDialogNode(),
      referenceTabsNode(),
      referenceTooltipNode()
    ]
  };
}

function referenceContentMedia(): JsonObject {
  return {
    $children: [
      {
        $comp: "Image",
        alt: "A geometric profile placeholder",
        height: 240,
        id: "profile-image",
        src: "/profile-placeholder.svg",
        width: 320
      }
    ],
    $comp: "Card",
    id: "profile-card",
    label: "Profile summary"
  };
}

function referencePopover(): JsonObject {
  return {
    $comp: "Popover",
    $children: [{ $comp: "Text", content: "Account is ready.", id: "popover-copy" }],
    id: "account-summary-popover",
    label: "Review account summary",
    panelLabel: "Current account summary",
    placement: "bottom"
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
    ...documentWithView({ ...referenceTextFieldNode(), path: "/name", store: "profile", value }),
    semantics: semanticGraph(value),
    stores: [referenceStoreDefinition(classification)]
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

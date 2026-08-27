import {
  CoreCatalogName,
  CoreCatalogVersion,
  UiControlNodeKind,
  UiControlTopologyVersion,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import { prepareUnifoldDocument, type UnifoldPreparationResult } from "@unislang/unifold";

export const AUTHORED_COLLECTION_ITEM_COUNT = 500;
export const AUTHORED_COLLECTION_COMPILATION_NAME = "500-item authored collection compilation";
export const AUTHORED_COLLECTION_REVISION_NAME =
  "500-item authored collection revision compilation";

interface AuthoredCollectionHarness {
  readonly initial: JsonObject;
  readonly revision: JsonObject;
}

export function createAuthoredCollectionHarness(): AuthoredCollectionHarness {
  return {
    initial: collectionDocument(AUTHORED_COLLECTION_ITEM_COUNT, "1"),
    revision: collectionDocument(AUTHORED_COLLECTION_ITEM_COUNT + 1, "2")
  };
}

export function compileAuthoredCollection(
  harness: AuthoredCollectionHarness
): UnifoldPreparationResult {
  return prepareUnifoldDocument(harness.initial);
}

export function compileAuthoredCollectionRevision(
  harness: AuthoredCollectionHarness
): UnifoldPreparationResult {
  return prepareUnifoldDocument(harness.revision);
}

function collectionDocument(itemCount: number, revision: string): JsonObject {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "collection-form", kind: UiControlNodeKind.Form },
        {
          id: "items",
          key: "items",
          kind: UiControlNodeKind.Array,
          parentId: "collection-form"
        }
      ]
    },
    id: "authored-collection-performance",
    layoutType: "collection-performance",
    layoutVersion: "1.0.0",
    layouts: [collectionLayout()],
    revision,
    schemaVersion: UiSchemaVersion.Version1,
    variables: {
      items: Array.from({ length: itemCount }, (_, index) => ({
        id: itemId(index),
        label: `Item ${String(index)}`
      }))
    }
  };
}

function collectionLayout(): JsonObject {
  return {
    layoutType: "collection-performance",
    template: {
      children: [
        {
          children: [
            {
              collection: "items",
              for: "item in {{items}}",
              id: "field",
              key: "id",
              props: { label: "{{item.label}}", value: "{{item.label}}" },
              type: "TextField"
            }
          ],
          id: "items",
          type: "Stack"
        }
      ],
      id: "collection-form",
      type: "Form"
    },
    variables: { items: { required: true, type: "array" } },
    version: "1.0.0"
  };
}

function itemId(index: number): string {
  return `item-${String(index).padStart(5, "0")}`;
}

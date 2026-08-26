import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject,
  type JsonUiNode,
  type UiDocument
} from "@unislang/unifold-contracts";
import {
  prepareUnifoldDocument,
  UnifoldDocumentCompiler,
  type UnifoldPreparationResult
} from "@unislang/unifold";

export const COLD_500_COMPILATION_NAME = "500-node cold document compilation";
export const CACHED_500_COMPILATION_NAME = "500-node cached document compilation";
export const NORMALIZE_2000_DOCUMENT_NAME = "2k-node document validation and normalization";
export const COMPOSED_500_COMPILATION_NAME = "500-instance composed document compilation";
export const COMPOSED_500_REVISION_NAME = "500-instance composed document revision compilation";
export const FIVE_HUNDRED_DOCUMENT_NODES = 500;
export const TWO_THOUSAND_DOCUMENT_NODES = 2_000;
export const FIVE_HUNDRED_COMPOSITION_INSTANCES = 500;
export const COMPOSED_DOCUMENT_NODES = 1 + FIVE_HUNDRED_COMPOSITION_INSTANCES * 2;

interface DocumentCompilationHarness {
  readonly cachedCompiler: UnifoldDocumentCompiler;
  readonly composed: JsonObject;
  readonly composedRevision: JsonObject;
  readonly fiveHundred: UiDocument;
  readonly twoThousand: UiDocument;
}

export function createDocumentCompilationHarness(): DocumentCompilationHarness {
  const fiveHundred = createCompilationDocument(FIVE_HUNDRED_DOCUMENT_NODES);
  const cachedCompiler = new UnifoldDocumentCompiler();
  cachedCompiler.prepare(fiveHundred);
  return {
    cachedCompiler,
    composed: createComposedCompilationDocument(FIVE_HUNDRED_COMPOSITION_INSTANCES),
    composedRevision: createComposedCompilationDocument(
      FIVE_HUNDRED_COMPOSITION_INSTANCES,
      "2",
      250
    ),
    fiveHundred,
    twoThousand: createCompilationDocument(TWO_THOUSAND_DOCUMENT_NODES)
  };
}

export function compileColdDocument(harness: DocumentCompilationHarness): UnifoldPreparationResult {
  return prepareUnifoldDocument(harness.fiveHundred);
}

export function compileCachedDocument(
  harness: DocumentCompilationHarness
): UnifoldPreparationResult {
  return harness.cachedCompiler.prepare(harness.fiveHundred);
}

export function normalizeLargeDocument(
  harness: DocumentCompilationHarness
): UnifoldPreparationResult {
  return prepareUnifoldDocument(harness.twoThousand);
}

export function compileComposedDocument(
  harness: DocumentCompilationHarness
): UnifoldPreparationResult {
  return prepareUnifoldDocument(harness.composed);
}

export function compileComposedRevision(
  harness: DocumentCompilationHarness
): UnifoldPreparationResult {
  return prepareUnifoldDocument(harness.composedRevision);
}

export function createCompilationDocument(nodeCount: number, revision = "1"): UiDocument {
  assertCompilationNodeCount(nodeCount);
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: `compilation-${nodeCount}`,
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision,
    schemaVersion: UiSchemaVersion.Version1,
    view: compilationRoot(nodeCount)
  };
}

function createComposedCompilationDocument(
  instanceCount: number,
  revision = "1",
  changedIndex = -1
): JsonObject {
  assertCompilationNodeCount(instanceCount);
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [compilationComposition()],
    id: `composed-compilation-${instanceCount}`,
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision,
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $children: Array.from({ length: instanceCount }, (_, index) => ({
        $compose: "CompilationField",
        $version: "1.0.0",
        id: compositionInstanceId(index),
        parameters: { label: index === changedIndex ? "Changed label" : `Field ${index}` }
      })),
      $comp: "Box",
      id: "composed-root"
    }
  };
}

function compilationComposition(): JsonObject {
  return {
    contractVersion: "1.0.0",
    exports: {},
    name: "CompilationField",
    parameters: { label: { required: true, type: "string" } },
    slots: [],
    template: {
      $children: [
        {
          $comp: "TextField",
          id: "field",
          label: { $parameter: "label" },
          name: "field",
          value: ""
        }
      ],
      $comp: "Composition",
      id: "root"
    },
    version: "1.0.0"
  };
}

function compositionInstanceId(index: number): string {
  return `composed-${String(index).padStart(5, "0")}`;
}

function assertCompilationNodeCount(nodeCount: number): void {
  if (!Number.isInteger(nodeCount) || nodeCount < 1) {
    throw new RangeError("Compilation fixtures require a positive integer node count.");
  }
}

function compilationRoot(nodeCount: number): JsonUiNode {
  return {
    $children: Array.from({ length: nodeCount - 1 }, (_, index) => ({
      $comp: "Box",
      id: `compilation-node-${String(index + 1).padStart(5, "0")}`
    })),
    $comp: "Box",
    id: "compilation-node-00000"
  };
}

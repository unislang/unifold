import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  UiModuleResourceKind,
  UiModuleSchemaUri,
  UiModuleSchemaVersion,
  createUiModuleRegistry,
  resolveUiModule,
  uiModuleIntegrity,
  type UiModule,
  type UiModuleSource
} from "@unislang/unifold-modules";

import { percentile } from "./profile-statistics.js";

const MODULE_COUNT = 17;
const NODE_COUNT = 500;
const PROFILE_SAMPLES = 30;
const RESOLUTION_P95_LIMIT_MILLISECONDS = 250;

export async function measureUiModuleResolution() {
  const sources = await moduleSources();
  await resolveSources(sources);
  const samples: number[] = [];
  let last: Awaited<ReturnType<typeof resolveSources>> | undefined;
  for (let index = 0; index < PROFILE_SAMPLES; index += 1) {
    const started = performance.now();
    last = await resolveSources(sources);
    samples.push(performance.now() - started);
  }
  return resolutionEvidence(requireResolution(last), samples);
}

async function resolveSources(sources: readonly UiModuleSource[]) {
  const registry = await createUiModuleRegistry(sources);
  if (registry.status !== UiModuleRegistryStatus.Ready)
    throw new Error("Performance UiModule registry failed.");
  const resolution = await resolveUiModule(registry.registry, entry());
  if (resolution.status !== UiModuleResolutionStatus.Resolved)
    throw new Error("Performance UiModule resolution failed.");
  return resolution;
}

async function moduleSources(): Promise<readonly UiModuleSource[]> {
  const modules: UiModule[] = [dependencyModule(0, undefined, undefined)];
  for (let index = 1; index < MODULE_COUNT - 1; index += 1) {
    const previous = modules.at(-1) as UiModule;
    modules.push(dependencyModule(index, previous, await uiModuleIntegrity(previous)));
  }
  const previous = modules.at(-1) as UiModule;
  modules.push(rootModule(previous, await uiModuleIntegrity(previous)));
  return modules.map((module, index) => ({ module, sourceId: `module-${index}.json` }));
}

function dependencyModule(
  index: number,
  imported: UiModule | undefined,
  integrity: string | undefined
): UiModule {
  return moduleValue(
    moduleId(index),
    imported === undefined ? [] : [moduleImport(imported, integrity as string)],
    [],
    [{ id: `message-${index}`, kind: UiModuleResourceKind.Message, value: `Message ${index}` }]
  );
}

function rootModule(imported: UiModule, integrity: string): UiModule {
  return moduleValue(
    "org.unifold.performance.root",
    [moduleImport(imported, integrity)],
    [{ document: layoutDocument(), name: "application" }],
    []
  );
}

function moduleValue(
  id: string,
  imports: UiModule["imports"],
  documents: UiModule["exports"]["documents"],
  resources: UiModule["exports"]["resources"]
): UiModule {
  return {
    $schema: UiModuleSchemaUri.Version1,
    exports: { compositions: [], documents, resources },
    id,
    imports,
    schemaVersion: UiModuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function moduleImport(module: UiModule, integrity: string) {
  return { integrity, moduleId: module.id, namespace: "shared", version: module.version };
}

function layoutDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "module-performance",
    layoutType: "performance-list",
    layoutVersion: "1.0.0",
    layouts: [
      {
        layoutType: "performance-list",
        template: { children: "{{items}}", id: "root", type: "Stack" },
        variables: { items: { required: true, type: "nodes" } },
        version: "1.0.0"
      }
    ],
    revision: "1",
    schemaVersion: "1.0.0",
    variables: {
      items: Array.from({ length: NODE_COUNT - 1 }, (_, index) => ({
        id: `item-${String(index).padStart(4, "0")}`,
        props: { content: `Item ${index}` },
        type: "Text"
      }))
    }
  };
}

function resolutionEvidence(
  resolution: Awaited<ReturnType<typeof resolveSources>>,
  samples: readonly number[]
) {
  const view = resolution.artifact.composedDocument["view"] as { $children?: unknown[] };
  const graphSize = resolution.artifact.graph.length;
  const nodeCount = (view.$children?.length ?? 0) + 1;
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    gate: {
      actualGraphSize: graphSize,
      actualNodeCount: nodeCount,
      actualP95Milliseconds: p95Milliseconds,
      limitP95Milliseconds: RESOLUTION_P95_LIMIT_MILLISECONDS,
      name: "17-module 500-node static resolution",
      passed: [graphSize === MODULE_COUNT, nodeCount === NODE_COUNT, p95Milliseconds <= 250].every(
        Boolean
      )
    },
    graphSize,
    nodeCount,
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function requireResolution(
  value: Awaited<ReturnType<typeof resolveSources>> | undefined
): Awaited<ReturnType<typeof resolveSources>> {
  if (value === undefined) throw new Error("UiModule performance samples are missing.");
  return value;
}

function entry() {
  return {
    exportName: "application",
    moduleId: "org.unifold.performance.root",
    version: "1.0.0"
  };
}

function moduleId(index: number): string {
  return `org.unifold.performance.module${index}`;
}

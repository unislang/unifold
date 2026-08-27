import {
  createTrustedLayoutDefinitionRegistry,
  TrustedLayoutDefinitionRegistry
} from "@unislang/unifold-compositions";
import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import type { UiModuleGraphNode } from "./graph.js";
import { qualifiedModuleName } from "./namespacing.js";
import {
  UiModuleDiagnosticCode,
  UiModuleResourceKind,
  type ResolveUiModuleOptions,
  type UiModuleDiagnostic,
  type UiModuleResourceExport,
  type UiModuleSourceLocation,
  type UiResolvedModuleResource
} from "./types.js";

const MAXIMUM_LAYOUT_DEFINITIONS = 256;

interface LayoutCandidate {
  readonly definition: JsonObject | undefined;
  readonly diagnostic: UiModuleDiagnostic | undefined;
  readonly source: UiModuleSourceLocation | undefined;
}

interface ResolvedLayoutRegistry {
  readonly diagnostics: readonly UiModuleDiagnostic[];
  readonly registrySources: ReadonlyMap<number, UiModuleSourceLocation>;
  readonly registry?: TrustedLayoutDefinitionRegistry;
}

export function resolveLayoutRegistry(
  nodes: readonly UiModuleGraphNode[],
  host: ResolveUiModuleOptions["layoutRegistry"]
): ResolvedLayoutRegistry {
  const candidates = nodes.flatMap(moduleLayoutCandidates);
  const diagnostics = candidates.flatMap(candidateDiagnostics);
  if (diagnostics.length > 0) return { diagnostics, registrySources: new Map() };
  return combineLayoutDefinitions(candidates.flatMap(candidateDefinitions), host);
}

function moduleLayoutCandidates(node: UiModuleGraphNode): LayoutCandidate[] {
  return node.registered.module.exports.resources
    .map((resource, index) => ({ index, resource }))
    .filter(({ resource }) => resource.kind === UiModuleResourceKind.Layout)
    .map(({ index, resource }) => layoutCandidate(node, resource, index));
}

function layoutCandidate(
  node: UiModuleGraphNode,
  resource: UiModuleResourceExport,
  index: number
): LayoutCandidate {
  if (!isJsonObject(resource.value)) {
    return invalidCandidate(node, index, "/value", "A layout resource value must be an object.");
  }
  if (resource.value["layoutType"] !== resource.id) {
    return invalidCandidate(
      node,
      index,
      "/value/layoutType",
      "A layout resource ID must match its value's local layoutType."
    );
  }
  const layoutType = qualifiedModuleName(node.namespace, `layout/${resource.id}`);
  return {
    definition: resolvedResourceValue(resource, layoutType) as JsonObject,
    diagnostic: undefined,
    source: resourceSource(node, index)
  };
}

function invalidCandidate(
  node: UiModuleGraphNode,
  index: number,
  suffix: string,
  message: string
): LayoutCandidate {
  return {
    definition: undefined,
    diagnostic: {
      code: UiModuleDiagnosticCode.InvalidLayoutResource,
      message,
      path: `/exports/resources/${String(index)}${suffix}`,
      sourceId: node.registered.sourceId
    },
    source: undefined
  };
}

function resourceSource(node: UiModuleGraphNode, index: number): UiModuleSourceLocation {
  const { module, sourceId } = node.registered;
  return {
    moduleId: module.id,
    pointer: `/exports/resources/${String(index)}/value`,
    sourceId,
    version: module.version
  };
}

export function resolvedResourceValue(
  resource: UiModuleResourceExport | UiResolvedModuleResource,
  qualifiedId: string
): JsonValue {
  if (resource.kind !== UiModuleResourceKind.Layout) return resource.value;
  if (!isJsonObject(resource.value)) return resource.value;
  return { ...resource.value, layoutType: qualifiedId };
}

function candidateDiagnostics(candidate: LayoutCandidate): UiModuleDiagnostic[] {
  return candidate.diagnostic === undefined ? [] : [candidate.diagnostic];
}

interface ModuleLayoutDefinition {
  readonly definition: JsonObject;
  readonly source: UiModuleSourceLocation;
}

function candidateDefinitions(candidate: LayoutCandidate): ModuleLayoutDefinition[] {
  if (candidate.definition === undefined) return [];
  if (candidate.source === undefined) return [];
  return [{ definition: candidate.definition, source: candidate.source }];
}

function combineLayoutDefinitions(
  moduleDefinitions: readonly ModuleLayoutDefinition[],
  host: ResolveUiModuleOptions["layoutRegistry"]
): ResolvedLayoutRegistry {
  const hostResult = hostDefinitions(host);
  if (hostResult.diagnostics.length > 0) return hostResult;
  const definitions = [
    ...hostResult.definitions,
    ...moduleDefinitions.map(({ definition }) => definition)
  ];
  return createBoundedRegistry(definitions, moduleDefinitions, hostResult.definitions.length);
}

interface HostDefinitionsResult extends ResolvedLayoutRegistry {
  readonly definitions: readonly JsonObject[];
}

function hostDefinitions(host: ResolveUiModuleOptions["layoutRegistry"]): HostDefinitionsResult {
  if (host === undefined) {
    return { definitions: [], diagnostics: [], registrySources: new Map() };
  }
  if (host instanceof TrustedLayoutDefinitionRegistry) {
    return { definitions: host.snapshot(), diagnostics: [], registrySources: new Map() };
  }
  return {
    definitions: [],
    diagnostics: [invalidHostRegistry()],
    registrySources: new Map()
  };
}

function createBoundedRegistry(
  definitions: readonly JsonObject[],
  modules: readonly ModuleLayoutDefinition[],
  hostCount: number
): ResolvedLayoutRegistry {
  if (definitions.length > MAXIMUM_LAYOUT_DEFINITIONS) {
    return { diagnostics: [resourceLimitDiagnostic()], registrySources: new Map() };
  }
  return {
    diagnostics: [],
    registry: createTrustedLayoutDefinitionRegistry(definitions),
    registrySources: moduleRegistrySources(modules, hostCount)
  };
}

function moduleRegistrySources(
  modules: readonly ModuleLayoutDefinition[],
  hostCount: number
): ReadonlyMap<number, UiModuleSourceLocation> {
  return new Map(modules.map(({ source }, index) => [hostCount + index, source]));
}

function invalidHostRegistry(): UiModuleDiagnostic {
  return {
    code: UiModuleDiagnosticCode.CompositionInvalid,
    message: "Layout registry must be created by the trusted registry API.",
    path: "/$layoutRegistry"
  };
}

function resourceLimitDiagnostic(): UiModuleDiagnostic {
  return {
    code: UiModuleDiagnosticCode.ResourceLimitExceeded,
    message: `A combined layout registry cannot exceed ${MAXIMUM_LAYOUT_DEFINITIONS} definitions.`,
    path: "/$layoutRegistry/definitions"
  };
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

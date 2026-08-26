import type { JsonPrimitive, JsonValue } from "@unislang/unifold-contracts";
import { DataClassification } from "@unislang/unifold-events";

import { SemanticCompilationStatus, SemanticDiagnosticCode, SemanticValueKind } from "./enums.js";
import { semanticError } from "./diagnostics.js";
import {
  resolveCompositionControlValue,
  validateCompositionBinding
} from "./composition-binding.js";
import { registryFor, schemaOrgContext } from "./registry.js";
import type {
  SemanticCompilationResult,
  SemanticCompilationSource,
  SemanticCompositionExportControlBinding,
  SemanticDiagnostic,
  SemanticEntity,
  SemanticGraph,
  SemanticPropertyValue,
  SemanticSnapshotSource
} from "./types.js";

export function compileSemanticGraph(
  graph: SemanticGraph,
  source: SemanticCompilationSource
): SemanticCompilationResult {
  const diagnostics = validateGraph(graph, source);
  if (diagnostics.length > 0) {
    return { diagnostics, status: SemanticCompilationStatus.Invalid };
  }
  const entities = [...graph.entities].sort(compareEntity).map((entity) => {
    return compileEntity(entity, source);
  });
  const jsonLd = { "@context": schemaOrgContext, "@graph": entities };
  return {
    diagnostics,
    jsonLd,
    serialized: serializeJsonLd(jsonLd),
    status: SemanticCompilationStatus.Valid
  };
}

export function serializeJsonLd(value: Readonly<Record<string, JsonValue>>): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function validateGraph(
  graph: SemanticGraph,
  source: SemanticCompilationSource
): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];
  const registry = registryFor(graph.vocabulary.release);
  if (registry === undefined) {
    diagnostics.push(releaseError(graph));
    return diagnostics;
  }
  validateEntities(graph, source, registry, diagnostics);
  return diagnostics;
}

function validateEntities(
  graph: SemanticGraph,
  source: SemanticCompilationSource,
  registry: ReturnType<typeof registryFor> & object,
  diagnostics: SemanticDiagnostic[]
): void {
  const ids = new Set<string>();
  graph.entities.forEach((entity, index) => {
    const path = `/entities/${index}`;
    validateIdentity(entity, ids, path, diagnostics);
    validateEntity(entity, source, registry, path, diagnostics);
  });
  validatePrimaryEntity(graph, ids, diagnostics);
}

function validateIdentity(
  entity: SemanticEntity,
  ids: Set<string>,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  if (entity.id.trim().length === 0) {
    diagnostics.push(
      semanticError(SemanticDiagnosticCode.EmptyEntityId, `${path}/id`, "Entity ID is required.")
    );
  }
  if (ids.has(entity.id)) {
    diagnostics.push(
      semanticError(
        SemanticDiagnosticCode.DuplicateEntityId,
        `${path}/id`,
        `Duplicate entity ID: ${entity.id}.`
      )
    );
  }
  ids.add(entity.id);
}

function validateEntity(
  entity: SemanticEntity,
  source: SemanticCompilationSource,
  registry: ReturnType<typeof registryFor> & object,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  const definition = registry[entity.type as keyof typeof registry];
  if (definition === undefined) {
    diagnostics.push(
      semanticError(
        SemanticDiagnosticCode.UnknownType,
        `${path}/type`,
        `Unknown Schema.org type: ${entity.type}.`
      )
    );
    return;
  }
  Object.entries(entity.properties).forEach(([name, value]) => {
    if (!definition.properties.has(name))
      diagnostics.push(unknownProperty(path, name, entity.type));
    validateValue(value, source, `${path}/properties/${name}`, diagnostics);
  });
}

function validateValue(
  value: SemanticPropertyValue,
  source: SemanticCompilationSource,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  validateScalarBinding(value, source, path, diagnostics);
  validateList(value, source, path, diagnostics);
}

function validateScalarBinding(
  value: SemanticPropertyValue,
  source: SemanticCompilationSource,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  if (value.kind === SemanticValueKind.NodeControlValue) {
    validateBinding(value.nodeId, source.snapshots, path, diagnostics);
  }
  if (value.kind === SemanticValueKind.CompositionExportControlValue) {
    validateCompositionBinding(value, source, path, diagnostics, (nodeId) =>
      validateBinding(nodeId, source.snapshots, path, diagnostics)
    );
  }
}

function validateList(
  value: SemanticPropertyValue,
  source: SemanticCompilationSource,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  if (value.kind === SemanticValueKind.List) {
    value.items.forEach((item, index) =>
      validateValue(item, source, `${path}/items/${index}`, diagnostics)
    );
  }
}

function validateBinding(
  nodeId: string,
  snapshots: SemanticSnapshotSource,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  const snapshot = snapshots[nodeId];
  if (snapshot === undefined) {
    diagnostics.push(
      bindingError(
        SemanticDiagnosticCode.MissingNode,
        path,
        "Unknown semantic binding node",
        nodeId
      )
    );
    return;
  }
  validateControl(snapshot.control, nodeId, path, diagnostics);
  validateVisibility(snapshot.base.visible, nodeId, path, diagnostics);
  validateClassification(snapshot.base.dataClassification, nodeId, path, diagnostics);
}

function validateControl(
  control: unknown,
  nodeId: string,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  if (control === undefined)
    diagnostics.push(
      bindingError(SemanticDiagnosticCode.MissingControl, path, "Node has no control value", nodeId)
    );
}

function validateVisibility(
  visible: boolean,
  nodeId: string,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  if (!visible)
    diagnostics.push(
      bindingError(SemanticDiagnosticCode.InvisibleBinding, path, "Node is not visible", nodeId)
    );
}

function validateClassification(
  classification: DataClassification,
  nodeId: string,
  path: string,
  diagnostics: SemanticDiagnostic[]
): void {
  if (classification !== DataClassification.Public)
    diagnostics.push(
      bindingError(SemanticDiagnosticCode.NonPublicBinding, path, "Node is not public", nodeId)
    );
}

function validatePrimaryEntity(
  graph: SemanticGraph,
  ids: ReadonlySet<string>,
  diagnostics: SemanticDiagnostic[]
): void {
  if (graph.primaryEntity !== undefined && !ids.has(graph.primaryEntity)) {
    diagnostics.push(
      semanticError(
        SemanticDiagnosticCode.MissingEntity,
        "/primaryEntity",
        `Unknown primary entity: ${graph.primaryEntity}.`
      )
    );
  }
}

function compileEntity(entity: SemanticEntity, source: SemanticCompilationSource) {
  const output: Record<string, JsonValue> = { "@id": entity.id, "@type": entity.type };
  Object.keys(entity.properties)
    .sort()
    .forEach((name) => {
      const value = entity.properties[name];
      if (value !== undefined) output[name] = resolveValue(value, source);
    });
  return output;
}

function resolveValue(value: SemanticPropertyValue, source: SemanticCompilationSource): JsonValue {
  return valueResolvers[value.kind](value, source);
}

type ValueResolver = (value: SemanticPropertyValue, source: SemanticCompilationSource) => JsonValue;

const valueResolvers: Readonly<Record<SemanticValueKind, ValueResolver>> = {
  [SemanticValueKind.Constant]: (value) =>
    (value as Extract<SemanticPropertyValue, { kind: SemanticValueKind.Constant }>).value,
  [SemanticValueKind.EntityReference]: (value) => ({
    "@id": (value as Extract<SemanticPropertyValue, { kind: SemanticValueKind.EntityReference }>)
      .entityId
  }),
  [SemanticValueKind.List]: (value, source) =>
    (value as Extract<SemanticPropertyValue, { kind: SemanticValueKind.List }>).items.map((item) =>
      resolveValue(item, source)
    ),
  [SemanticValueKind.NodeControlValue]: (value, source) =>
    source.snapshots[
      (value as Extract<SemanticPropertyValue, { kind: SemanticValueKind.NodeControlValue }>).nodeId
    ]?.control?.value as JsonPrimitive,
  [SemanticValueKind.CompositionExportControlValue]: (value, source) =>
    resolveCompositionControlValue(value as SemanticCompositionExportControlBinding, source)
};

function bindingError(
  code: SemanticDiagnosticCode,
  path: string,
  message: string,
  nodeId: string
): SemanticDiagnostic {
  return semanticError(code, path, `${message}: ${nodeId}.`);
}

function compareEntity(left: SemanticEntity, right: SemanticEntity): number {
  return left.id.localeCompare(right.id);
}

function releaseError(graph: SemanticGraph): SemanticDiagnostic {
  return semanticError(
    SemanticDiagnosticCode.UnsupportedRelease,
    "/vocabulary/release",
    `Unsupported Schema.org release: ${graph.vocabulary.release}.`
  );
}

function unknownProperty(path: string, name: string, type: string): SemanticDiagnostic {
  return semanticError(
    SemanticDiagnosticCode.UnknownProperty,
    `${path}/properties/${name}`,
    `Property ${name} is not registered for ${type}.`
  );
}

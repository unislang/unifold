import type {
  UiCompositionInstanceManifest,
  UiCompositionNodeProvenance,
  UiResolvedCompositionExport
} from "@unislang/unifold-contracts";

import type {
  CompositionOwnerContext,
  ExpansionContext,
  ExpansionScope
} from "./expansion-context.js";
import type { CompositionDefinition } from "./types.js";

export function createCompositionOwner(
  definition: CompositionDefinition,
  instanceId: string,
  instanceSourcePointer: string,
  definitionSourcePointer: string,
  parent: CompositionOwnerContext | undefined
): CompositionOwnerContext {
  return {
    ancestry: [...(parent?.ancestry ?? []), instanceId],
    definitionName: definition.name,
    definitionSourcePointer,
    definitionVersion: definition.version,
    instanceId,
    instanceSourcePointer
  };
}

export function createSlotOwner(
  owner: CompositionOwnerContext,
  name: string,
  sourcePointer: string
): CompositionOwnerContext {
  return { ...owner, slotName: name, slotSourcePointer: sourcePointer };
}

export function recordNodeProvenance(
  localId: string,
  nodeId: string,
  sourcePointer: string,
  scope: ExpansionScope,
  context: ExpansionContext
): void {
  const owner = scope.owner;
  if (owner === undefined) return;
  context.nodeProvenanceById[nodeId] = provenance(localId, sourcePointer, owner);
}

export function publishCompositionInstance(
  definition: CompositionDefinition,
  instanceId: string,
  localIds: ReadonlyMap<string, string>,
  owner: CompositionOwnerContext,
  context: ExpansionContext
): void {
  const exports = resolvedExports(definition, localIds);
  context.exportsByInstanceId[instanceId] = Object.fromEntries(
    Object.entries(exports).map(([alias, descriptor]) => [alias, descriptor.nodeId])
  );
  context.instances.push(instanceManifest(definition, instanceId, owner, exports));
}

function provenance(
  localId: string,
  sourcePointer: string,
  owner: CompositionOwnerContext
): UiCompositionNodeProvenance {
  const base = {
    ancestry: owner.ancestry,
    definitionName: owner.definitionName,
    definitionVersion: owner.definitionVersion,
    instanceId: owner.instanceId,
    instanceSourcePointer: owner.instanceSourcePointer,
    localId
  };
  if (owner.slotName === undefined) return { ...base, definitionSourcePointer: sourcePointer };
  return {
    ...base,
    slotName: owner.slotName,
    slotSourcePointer: owner.slotSourcePointer ?? sourcePointer
  };
}

function resolvedExports(
  definition: CompositionDefinition,
  localIds: ReadonlyMap<string, string>
): Readonly<Record<string, UiResolvedCompositionExport>> {
  return Object.fromEntries(
    Object.entries(definition.exports)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([alias, descriptor]) => [
        alias,
        { ...descriptor, nodeId: requireNodeId(localIds, descriptor.localId) }
      ])
  );
}

function requireNodeId(localIds: ReadonlyMap<string, string>, localId: string): string {
  const nodeId = localIds.get(localId);
  if (nodeId === undefined) throw new Error(`Validated composition export is missing: ${localId}.`);
  return nodeId;
}

function instanceManifest(
  definition: CompositionDefinition,
  instanceId: string,
  owner: CompositionOwnerContext,
  exports: Readonly<Record<string, UiResolvedCompositionExport>>
): UiCompositionInstanceManifest {
  return {
    ancestry: owner.ancestry,
    definitionName: definition.name,
    definitionSourcePointer: owner.definitionSourcePointer,
    definitionVersion: definition.version,
    exports,
    instanceId,
    instanceSourcePointer: owner.instanceSourcePointer,
    rootNodeId: instanceId
  };
}

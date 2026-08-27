import {
  UiControlNodeKind,
  type JsonObject,
  type UiControlNodeDefinition
} from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { addLayoutDiagnostic, isLayoutObject } from "./layout-values.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

export interface LayoutCollectionControlMember {
  readonly collectionId: string;
  readonly id: string;
  readonly key: string;
}

export function recordCollectionMember(
  collectionId: string | undefined,
  key: string,
  nodes: readonly JsonObject[],
  members: LayoutCollectionControlMember[]
): void {
  const id = firstNodeId(nodes);
  if (collectionId === undefined) return;
  if (id !== undefined) members.push({ collectionId, id, key });
}

function firstNodeId(nodes: readonly JsonObject[]): string | undefined {
  const id = nodes[0]?.["id"];
  return typeof id === "string" ? id : undefined;
}

const aggregateKinds = new Set<unknown>([UiControlNodeKind.Array, UiControlNodeKind.Record]);

export function coupleLayoutCollectionControls(
  value: unknown,
  collections: Readonly<Record<string, LayoutCollectionDefinition>>,
  members: readonly LayoutCollectionControlMember[],
  diagnostics: CompositionDiagnostic[]
): JsonObject | undefined {
  const definitions = Object.values(collections);
  if (definitions.length === 0) return retainedTopology(value);
  const topology = layoutTopology(value);
  const nodes = availableTopologyNodes(topology);
  definitions.forEach((definition) => validateAggregate(definition, nodes, diagnostics));
  validateMemberCollisions(members, nodes, collections, diagnostics);
  return coupledTopology(topology, nodes, members, diagnostics);
}

function layoutTopology(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return isLayoutObject(value) ? value : undefined;
}

function availableTopologyNodes(
  topology: Readonly<Record<string, unknown>> | undefined
): readonly unknown[] {
  if (topology === undefined) return [];
  return topologyNodes(topology);
}

function coupledTopology(
  topology: Readonly<Record<string, unknown>> | undefined,
  nodes: readonly unknown[],
  members: readonly LayoutCollectionControlMember[],
  diagnostics: readonly CompositionDiagnostic[]
): JsonObject | undefined {
  if (diagnostics.length > 0) return undefined;
  if (topology === undefined) return undefined;
  return {
    ...topology,
    nodes: [...nodes, ...members.map(controlMemberDefinition)]
  } as JsonObject;
}

function retainedTopology(value: unknown): JsonObject | undefined {
  if (!isLayoutObject(value)) return undefined;
  return structuredClone(value) as JsonObject;
}

function topologyNodes(value: Readonly<Record<string, unknown>>): readonly unknown[] {
  return Array.isArray(value["nodes"]) ? value["nodes"] : [];
}

function validateAggregate(
  definition: LayoutCollectionDefinition,
  nodes: readonly unknown[],
  diagnostics: CompositionDiagnostic[]
): void {
  const matches = nodes.filter((node) => controlId(node) === definition.controlId);
  if (matches.length === 1 && aggregateKinds.has(controlKind(matches[0]))) return;
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutNode,
    definition.declarationPointer,
    `Collection "${definition.controlId}" requires one explicit array or record control with the same id.`
  );
}

function validateMemberCollisions(
  members: readonly LayoutCollectionControlMember[],
  nodes: readonly unknown[],
  collections: Readonly<Record<string, LayoutCollectionDefinition>>,
  diagnostics: CompositionDiagnostic[]
): void {
  const authoredIds = new Set(nodes.map(controlId).filter((id): id is string => id !== undefined));
  members
    .filter(({ id }) => authoredIds.has(id))
    .forEach((member) => memberCollision(member, collections, diagnostics));
}

function memberCollision(
  member: LayoutCollectionControlMember,
  collections: Readonly<Record<string, LayoutCollectionDefinition>>,
  diagnostics: CompositionDiagnostic[]
): void {
  const definition = collections[member.collectionId];
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutNode,
    definition?.declarationPointer ?? "/controls/nodes",
    `Generated collection control "${member.id}" must not be declared explicitly.`
  );
}

function controlId(value: unknown): string | undefined {
  if (!isLayoutObject(value)) return undefined;
  return typeof value["id"] === "string" ? value["id"] : undefined;
}

function controlKind(value: unknown): unknown {
  return isLayoutObject(value) ? value["kind"] : undefined;
}

function controlMemberDefinition(member: LayoutCollectionControlMember): UiControlNodeDefinition {
  return {
    id: member.id,
    key: member.key,
    kind: UiControlNodeKind.Control,
    parentId: member.collectionId
  };
}

import { CompositionIdentitySegmentKind } from "./enums.js";
import type { ExpansionScope } from "./expansion-context.js";
import type { DecodedCompositionIdentitySegment } from "./types.js";

const NAMESPACE_SEPARATOR = "::";
const SLOT_MARKER = "slot:";

export function encodeCompositionIdSegment(value: string): string {
  return encodeURIComponent(value);
}

export function decodeCompositionIdSegment(value: string): string | undefined {
  return value.length === 0 ? undefined : decodeCanonicalSegment(value);
}

function decodeCanonicalSegment(value: string): string | undefined {
  try {
    const decoded = decodeURIComponent(value);
    return encodeCompositionIdSegment(decoded) === value ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export function namespacedCompositionId(prefix: string | undefined, value: string): string {
  const encoded = encodeCompositionIdSegment(value);
  return prefix === undefined ? encoded : `${prefix}${NAMESPACE_SEPARATOR}${encoded}`;
}

export function compositionSlotNamespace(prefix: string, slotName: string): string {
  return `${prefix}${NAMESPACE_SEPARATOR}${SLOT_MARKER}${encodeCompositionIdSegment(slotName)}`;
}

export function legacyCompositionIdentity(value: string): string {
  return decodeURIComponent(value);
}

export function legacyCompositionNodeIdentity(
  value: string,
  sourceId: string,
  isRoot: boolean
): string | undefined {
  if (isRoot) return legacyCompositionIdentity(value);
  return sourceId.includes(NAMESPACE_SEPARATOR) ? undefined : legacyCompositionIdentity(value);
}

export function recordCompositionIdentityAlias(
  aliases: Record<string, string>,
  nodeId: string,
  legacyNodeId: string | undefined
): void {
  if (legacyNodeId === undefined || legacyNodeId === nodeId) return;
  aliases[nodeId] = legacyNodeId;
}

export function expandedCompositionNodeId(
  sourceId: string,
  scope: ExpansionScope,
  isRoot: boolean
): string {
  if (isRoot && scope.rootId !== undefined) return scope.rootId;
  return namespacedCompositionId(scope.prefix, sourceId);
}

export function legacyExpandedCompositionNodeId(
  id: string,
  sourceId: string,
  scope: ExpansionScope,
  isRoot: boolean
): string | undefined {
  if (scope.owner === undefined) return sourceId;
  if (scope.legacyCompatible !== true) return undefined;
  return legacyCompositionNodeIdentity(id, sourceId, isRoot);
}

export function decodeExpandedCompositionId(
  value: string
): readonly DecodedCompositionIdentitySegment[] | undefined {
  if (value.length === 0) return undefined;
  return decodeIdentityParts(value.split(NAMESPACE_SEPARATOR));
}

function decodeIdentityParts(
  parts: readonly string[]
): readonly DecodedCompositionIdentitySegment[] | undefined {
  if (parts.some((part) => part.length === 0)) return undefined;
  const decoded = parts.map(decodeIdentityPart);
  return decoded.every(isDecodedSegment)
    ? (decoded as DecodedCompositionIdentitySegment[])
    : undefined;
}

function decodeIdentityPart(value: string): DecodedCompositionIdentitySegment | undefined {
  if (value.startsWith(SLOT_MARKER)) {
    return decodedSegment(CompositionIdentitySegmentKind.Slot, value.slice(SLOT_MARKER.length));
  }
  return decodedSegment(CompositionIdentitySegmentKind.Node, value);
}

function decodedSegment(
  kind: CompositionIdentitySegmentKind,
  encoded: string
): DecodedCompositionIdentitySegment | undefined {
  const value = decodeCompositionIdSegment(encoded);
  return value === undefined ? undefined : { kind, value };
}

function isDecodedSegment(
  value: DecodedCompositionIdentitySegment | undefined
): value is DecodedCompositionIdentitySegment {
  return value !== undefined;
}

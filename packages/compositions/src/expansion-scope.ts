import type { ExpansionScope } from "./expansion-context.js";
import { compositionSlotNamespace } from "./identity.js";
import { createSlotOwner } from "./manifest.js";

export function createSlotExpansionScope(
  scope: ExpansionScope,
  name: string,
  nodePath: string
): ExpansionScope {
  const attachments = controlAttachmentIds(scope);
  return {
    ...(attachments === undefined ? {} : { controlAttachmentIds: attachments }),
    legacyCompatible: isLegacyCompatible(name, scope),
    owner: createSlotOwner(requireOwner(scope), name, nodePath),
    prefix: compositionSlotNamespace(scopePrefix(scope), name)
  };
}

export function controlAttachmentIds(
  scope: ExpansionScope
): ReadonlyMap<string, string> | undefined {
  return scope.controlAttachmentIds ?? scope.localIds;
}

export function isLegacyCompatible(sourceId: string, scope: ExpansionScope): boolean {
  if (sourceId.includes("::")) return false;
  return scope.owner === undefined ? true : scope.legacyCompatible === true;
}

export function recordLocalId(sourceId: string, id: string, scope: ExpansionScope): void {
  if (scope.localIds?.has(sourceId) === false) scope.localIds.set(sourceId, id);
}

function requireOwner(scope: ExpansionScope): NonNullable<ExpansionScope["owner"]> {
  if (scope.owner === undefined) throw new Error("A validated slot must have a composition owner.");
  return scope.owner;
}

function scopePrefix(scope: ExpansionScope): string {
  const prefix = scope.rootId ?? scope.prefix;
  if (prefix === undefined) throw new Error("A validated slot must have a namespace.");
  return prefix;
}

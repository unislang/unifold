import { UiControlNodeKind, type UiControlNodeDefinition } from "@unislang/unifold-contracts";

import { compositionError } from "./diagnostics.js";
import { CompositionDiagnosticCode } from "./enums.js";
import type { ExpansionContext, PendingControlTopology } from "./expansion-context.js";
import { childPath } from "./path.js";
import type { CompositionDefinition, CompositionDiagnostic } from "./types.js";

const MAX_EXPANDED_CONTROL_NODES = 10_000;

export function registerCompositionControlTopology(
  definition: CompositionDefinition,
  instance: { readonly controlMount?: { readonly key: string; readonly parentId: string } },
  localIds: ReadonlyMap<string, string>,
  callerLocalIds: ReadonlyMap<string, string> | undefined,
  definitionPath: string,
  instancePath: string,
  context: ExpansionContext
): void {
  if (definition.controls === undefined && instance.controlMount === undefined) return;
  context.pendingControlTopologies.push({
    callerLocalIds,
    definition,
    definitionPath,
    instancePath,
    localIds,
    mount: instance.controlMount
  });
}

export function finalizeCompositionControlTopologies(context: ExpansionContext): void {
  context.pendingControlTopologies.forEach((pending) => finalizeControlTopology(pending, context));
}

export function createControlAuthority(
  nodes: readonly UiControlNodeDefinition[],
  diagnostics: CompositionDiagnostic[]
): Set<string> {
  const authority = new Set<string>();
  nodes.forEach((node, index) => {
    if (!authority.has(node.id)) authority.add(node.id);
    else diagnostics.push(duplicateAuthority(node.id, `/controls/nodes/${String(index)}`));
  });
  return authority;
}

function finalizeControlTopology(pending: PendingControlTopology, context: ExpansionContext): void {
  const controls = pending.definition.controls;
  if (controls === undefined) {
    context.diagnostics.push(invalidMount(pending.instancePath, "Control mount has no topology."));
    return;
  }
  finalizeKnownTopology(pending, controls.nodes, context);
}

function finalizeKnownTopology(
  pending: PendingControlTopology,
  nodes: readonly UiControlNodeDefinition[],
  context: ExpansionContext
): void {
  const root = singleRoot(nodes);
  if (root === undefined) {
    context.diagnostics.push(invalidMount(pending.instancePath, "Topology requires one root."));
    return;
  }
  finalizeKnownRoot(pending, nodes, root, context);
}

function singleRoot(
  nodes: readonly UiControlNodeDefinition[]
): UiControlNodeDefinition | undefined {
  const roots = nodes.filter(({ parentId }) => parentId === undefined);
  if (roots.length !== 1) return undefined;
  return roots[0];
}

function finalizeKnownRoot(
  pending: PendingControlTopology,
  nodes: readonly UiControlNodeDefinition[],
  root: UiControlNodeDefinition,
  context: ExpansionContext
): void {
  if (!validRootMount(root, pending, context.diagnostics)) return;
  const resolution = resolveMount(pending, context);
  if (!resolution.valid) return;
  appendControlTopology(pending, nodes, context, resolution.mount);
}

function validRootMount(
  root: UiControlNodeDefinition,
  pending: PendingControlTopology,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (root.kind === UiControlNodeKind.Form) return validFormMount(pending, diagnostics);
  return validFragmentMount(pending, diagnostics);
}

function validFormMount(
  pending: PendingControlTopology,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (pending.mount === undefined) return true;
  diagnostics.push(invalidMount(pending.instancePath, "A form topology cannot be mounted."));
  return false;
}

function validFragmentMount(
  pending: PendingControlTopology,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (pending.mount !== undefined) return true;
  diagnostics.push(
    invalidMount(pending.instancePath, "A non-form topology requires a control mount.")
  );
  return false;
}

function appendControlTopology(
  pending: PendingControlTopology,
  nodes: readonly UiControlNodeDefinition[],
  context: ExpansionContext,
  mount: { readonly key: string; readonly parentId: string } | undefined
): void {
  if (context.controlNodes.length + nodes.length > MAX_EXPANDED_CONTROL_NODES) {
    context.diagnostics.push(controlNodeLimit(pending.definitionPath));
    return;
  }
  nodes.forEach((node, index) => {
    const expanded = applyControlMount(expandedControlNode(node, pending.localIds), node, mount);
    registerExpandedControl(expanded, controlNodePath(pending.definitionPath, index), context);
  });
}

interface MountResolution {
  readonly mount?: { readonly key: string; readonly parentId: string };
  readonly valid: boolean;
}

function resolveMount(pending: PendingControlTopology, context: ExpansionContext): MountResolution {
  const mount = pending.mount;
  if (mount === undefined) return { valid: true };
  return resolveKnownMount(mount, pending, context);
}

function resolveKnownMount(
  mount: NonNullable<PendingControlTopology["mount"]>,
  pending: PendingControlTopology,
  context: ExpansionContext
): MountResolution {
  const parentId = resolvedMountParent(mount.parentId, pending);
  if (parentId === undefined) {
    context.diagnostics.push(unknownMountParent(mount.parentId, pending.instancePath));
    return { valid: false };
  }
  if (!validMountTarget(parentId, pending.instancePath, context)) return { valid: false };
  return { mount: { key: mount.key, parentId }, valid: true };
}

function resolvedMountParent(id: string, pending: PendingControlTopology): string | undefined {
  if (pending.callerLocalIds === undefined) return id;
  return pending.callerLocalIds.get(id);
}

function validMountTarget(parentId: string, path: string, context: ExpansionContext): boolean {
  const kind = context.controlNodeKinds.get(parentId);
  if (kind === undefined) {
    context.diagnostics.push(unknownMountParent(parentId, path));
    return false;
  }
  if (kind !== UiControlNodeKind.Array) return true;
  context.diagnostics.push(
    invalidMount(path, "Array mounts require an explicit ordering contract.")
  );
  return false;
}

function expandedControlNode(
  node: UiControlNodeDefinition,
  localIds: ReadonlyMap<string, string>
): UiControlNodeDefinition {
  return {
    ...node,
    id: requireExpandedId(node.id, localIds),
    ...(node.parentId === undefined ? {} : { parentId: requireExpandedId(node.parentId, localIds) })
  };
}

function applyControlMount(
  node: UiControlNodeDefinition,
  source: UiControlNodeDefinition,
  mount: { readonly key: string; readonly parentId: string } | undefined
): UiControlNodeDefinition {
  if (mount === undefined || source.parentId !== undefined) return node;
  return { ...node, key: mount.key, parentId: mount.parentId };
}

function registerExpandedControl(
  node: UiControlNodeDefinition,
  path: string,
  context: ExpansionContext
): void {
  if (context.controlNodeIds.has(node.id)) {
    context.diagnostics.push(duplicateAuthority(node.id, path));
    return;
  }
  context.controlNodeIds.add(node.id);
  context.controlNodeKinds.set(node.id, node.kind);
  context.controlNodes.push(node);
}

function duplicateAuthority(id: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateControlAuthority,
    childPath(path, "id"),
    `Expanded control authority is duplicated: ${id}.`
  );
}

function invalidMount(path: string, message: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.InvalidControlMount,
    childPath(path, "controlMount"),
    message
  );
}

function unknownMountParent(id: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownControlParent,
    childPath(childPath(path, "controlMount"), "parentId"),
    `Composition control mount references unknown caller-local parent ${id}.`
  );
}

function controlNodeLimit(definitionPath: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.ControlNodeLimit,
    childPath(childPath(definitionPath, "controls"), "nodes"),
    `Expanded control topology exceeds ${String(MAX_EXPANDED_CONTROL_NODES)} nodes.`
  );
}

function requireExpandedId(id: string, localIds: ReadonlyMap<string, string>): string {
  const expanded = localIds.get(id);
  if (expanded !== undefined) return expanded;
  throw new Error(`Validated composition control id is missing: ${id}.`);
}

function controlNodePath(definitionPath: string, index: number): string {
  return childPath(childPath(childPath(definitionPath, "controls"), "nodes"), index);
}

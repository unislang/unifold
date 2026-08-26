import type { UiCompositionInstanceManifest } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  type StructureReconcileCommand,
  type UiCommand,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

type CompositionInstances = Readonly<Record<string, UiCompositionInstanceManifest>>;

export function removedOwnerIds(
  commands: readonly UiCommand[],
  current: readonly UiNodeSnapshot[]
): readonly string[] {
  const removed = new Set<string>();
  commands.forEach((command) => collectExplicitRemoval(command, removed));
  const reconcile = reconciliationCommand(commands);
  if (reconcile !== undefined) collectReconciledRemovals(reconcile, current, removed);
  return [...removed];
}

export function reconciledCompositionInstances(
  commands: readonly UiCommand[],
  current: CompositionInstances
): CompositionInstances {
  return reconciliationCommand(commands)?.compositionInstances ?? current;
}

function collectExplicitRemoval(command: UiCommand, removed: Set<string>): void {
  if (command.type === UiCommandType.StructureRemove) removed.add(command.id);
}

function collectReconciledRemovals(
  command: StructureReconcileCommand,
  current: readonly UiNodeSnapshot[],
  removed: Set<string>
): void {
  const next = new Map(command.nodes.map((node) => [node.id, node]));
  current.forEach((node) => {
    const replacement = next.get(node.id);
    if (replacement === undefined || changedLifetime(node, replacement)) removed.add(node.id);
  });
}

function changedLifetime(left: UiNodeSnapshot, right: UiNodeSnapshot): boolean {
  return lifetimeKey(left) !== lifetimeKey(right);
}

function lifetimeKey(node: UiNodeSnapshot): string {
  return `${node.kind}:${node.type}:${node.definitionVersion}`;
}

function reconciliationCommand(
  commands: readonly UiCommand[]
): StructureReconcileCommand | undefined {
  const reconciliations = commands.filter(isReconciliationCommand);
  if (reconciliations.length > 1) throw new Error("Only one structure reconciliation is allowed.");
  return reconciliations[0];
}

function isReconciliationCommand(command: UiCommand): command is StructureReconcileCommand {
  return command.type === UiCommandType.StructureReconcile;
}

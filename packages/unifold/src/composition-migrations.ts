import type { UiCompositionInstanceManifest } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

const MAXIMUM_MIGRATION_EDGES = 128;
const MAXIMUM_PRESERVED_EXPORTS = 128;

export enum UiCompositionUnmappedMigration {
  Reset = "reset"
}

export interface UiCompositionVersionReference {
  readonly name: string;
  readonly version: string;
}

export interface UiCompositionPreservedExport {
  readonly source: string;
  readonly target: string;
}

export interface UiCompositionVersionMigration {
  readonly from: UiCompositionVersionReference;
  readonly preserve: readonly UiCompositionPreservedExport[];
  readonly to: UiCompositionVersionReference;
  readonly unmapped: UiCompositionUnmappedMigration.Reset;
}

export interface UiCompositionMigrationPlan {
  readonly nodeIdentityAliases: Readonly<Record<string, string>>;
  readonly resetNodeIds: readonly string[];
}

export class UiCompositionMigrationError extends Error {
  constructor(code: string) {
    super(`Composition migration failed: ${code}.`);
    this.name = "UiCompositionMigrationError";
  }
}

interface MigrationState {
  readonly aliases: Record<string, string>;
  readonly claimedSources: Set<string>;
  readonly edges: ReadonlyMap<string, UiCompositionVersionMigration>;
  readonly resetIds: Set<string>;
}

export function planCompositionMigration(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument,
  migrations: readonly UiCompositionVersionMigration[] = []
): UiCompositionMigrationPlan {
  const state = createMigrationState(current, next, migrations);
  Object.values(next.compositionsByInstanceId).forEach((target) =>
    planInstance(current, next, target, state)
  );
  return {
    nodeIdentityAliases: sortedRecord(state.aliases),
    resetNodeIds: [...state.resetIds].sort()
  };
}

function createMigrationState(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument,
  migrations: readonly UiCompositionVersionMigration[]
): MigrationState {
  const aliases = applicableIdentityAliases(current, next);
  return {
    aliases,
    claimedSources: new Set(Object.values(aliases)),
    edges: migrationEdges(migrations),
    resetIds: new Set()
  };
}

function applicableIdentityAliases(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(next.nodeIdentityAliases).filter(([target, source]) =>
      aliasApplies(current, target, source)
    )
  );
}

function aliasApplies(current: UnifoldIrDocument, target: string, source: string): boolean {
  if (current.nodesById[target] !== undefined) return false;
  return current.nodesById[source] !== undefined;
}

function migrationEdges(
  migrations: readonly UiCompositionVersionMigration[]
): ReadonlyMap<string, UiCompositionVersionMigration> {
  if (migrations.length > MAXIMUM_MIGRATION_EDGES) throw migrationError("edge-budget");
  const edges = new Map<string, UiCompositionVersionMigration>();
  migrations.forEach((migration) => publishMigrationEdge(migration, edges));
  return edges;
}

function publishMigrationEdge(
  migration: UiCompositionVersionMigration,
  edges: Map<string, UiCompositionVersionMigration>
): void {
  validateMigration(migration);
  const key = migrationKey(migration.from, migration.to);
  if (edges.has(key)) throw migrationError("duplicate-edge");
  assertNoMigrationCycle(migration, [...edges.values()]);
  edges.set(key, migration);
}

function assertNoMigrationCycle(
  migration: UiCompositionVersionMigration,
  edges: readonly UiCompositionVersionMigration[]
): void {
  const source = referenceKey(migration.from);
  const visited = new Set([referenceKey(migration.to)]);
  const pending = [...visited];
  while (pending.length > 0)
    appendMigrationTargets(pending.shift() as string, edges, visited, pending);
  if (visited.has(source)) throw migrationError("cycle");
}

function appendMigrationTargets(
  source: string,
  edges: readonly UiCompositionVersionMigration[],
  visited: Set<string>,
  pending: string[]
): void {
  edges
    .filter((edge) => referenceKey(edge.from) === source)
    .map((edge) => referenceKey(edge.to))
    .filter((target) => !visited.has(target))
    .forEach((target) => {
      visited.add(target);
      pending.push(target);
    });
}

function validateMigration(migration: UiCompositionVersionMigration): void {
  validateReference(migration.from);
  validateReference(migration.to);
  if (sameReference(migration.from, migration.to)) throw migrationError("cycle");
  validateMigrationPolicy(migration);
  validatePreservedExports(migration.preserve);
}

function validateMigrationPolicy(migration: UiCompositionVersionMigration): void {
  if (migration.unmapped !== UiCompositionUnmappedMigration.Reset)
    throw migrationError("unmapped-policy");
  if (migration.preserve.length > MAXIMUM_PRESERVED_EXPORTS)
    throw migrationError("preserve-budget");
}

function validateReference(reference: UiCompositionVersionReference): void {
  if (!nonEmpty(reference.name)) throw migrationError("definition-name");
  if (!nonEmpty(reference.version)) throw migrationError("definition-version");
}

function validatePreservedExports(exports: readonly UiCompositionPreservedExport[]): void {
  const sources = new Set<string>();
  const targets = new Set<string>();
  exports.forEach((mapping) => {
    validateExportName(mapping.source);
    validateExportName(mapping.target);
    claimExport(sources, mapping.source, "reused-source-export");
    claimExport(targets, mapping.target, "reused-target-export");
  });
}

function validateExportName(value: string): void {
  if (!nonEmpty(value)) throw migrationError("export-name");
}

function claimExport(claimed: Set<string>, value: string, code: string): void {
  if (claimed.has(value)) throw migrationError(code);
  claimed.add(value);
}

function planInstance(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument,
  target: UiCompositionInstanceManifest,
  state: MigrationState
): void {
  const source = current.compositionsByInstanceId[target.instanceId];
  if (source === undefined) return;
  if (sameDefinition(source, target)) return;
  const migration = requireMigration(source, target, state.edges);
  resetInstanceNodes(next, target.instanceId, state.resetIds);
  migration.preserve.forEach((mapping) =>
    preserveExport(current, next, source, target, mapping, state)
  );
}

function requireMigration(
  source: UiCompositionInstanceManifest,
  target: UiCompositionInstanceManifest,
  edges: ReadonlyMap<string, UiCompositionVersionMigration>
): UiCompositionVersionMigration {
  const migration = edges.get(migrationKey(instanceReference(source), instanceReference(target)));
  if (migration === undefined) throw migrationError("missing-edge");
  return migration;
}

function resetInstanceNodes(
  document: UnifoldIrDocument,
  instanceId: string,
  resetIds: Set<string>
): void {
  Object.entries(document.nodesById).forEach(([id, node]) => {
    if (node.composition?.instanceId === instanceId) resetIds.add(id);
  });
}

function preserveExport(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument,
  source: UiCompositionInstanceManifest,
  target: UiCompositionInstanceManifest,
  mapping: UiCompositionPreservedExport,
  state: MigrationState
): void {
  const sourceId = requireExport(source, mapping.source);
  const targetId = requireExport(target, mapping.target);
  assertCompatibleNodes(requireNode(current, sourceId), requireNode(next, targetId));
  state.resetIds.delete(targetId);
  if (sourceId === targetId) return;
  publishAlias(targetId, sourceId, next, state);
}

function publishAlias(
  targetId: string,
  sourceId: string,
  next: UnifoldIrDocument,
  state: MigrationState
): void {
  assertAlias(next.nodesById[sourceId] === undefined, "active-source");
  assertAlias(state.aliases[targetId] === undefined, "duplicate-target");
  assertAlias(!state.claimedSources.has(sourceId), "reused-source");
  state.aliases[targetId] = sourceId;
  state.claimedSources.add(sourceId);
}

function assertAlias(valid: boolean, code: string): void {
  if (!valid) throw migrationError(code);
}

function requireExport(instance: UiCompositionInstanceManifest, alias: string): string {
  const descriptor = instance.exports[alias];
  if (descriptor === undefined) throw migrationError("unknown-export");
  return descriptor.nodeId;
}

function requireNode(document: UnifoldIrDocument, id: string): UnifoldIrNode {
  const node = document.nodesById[id];
  if (node === undefined) throw migrationError("unknown-node");
  return node;
}

function assertCompatibleNodes(source: UnifoldIrNode, target: UnifoldIrNode): void {
  if (source.kind !== target.kind) throw migrationError("incompatible-node");
  if (source.componentType !== target.componentType) throw migrationError("incompatible-node");
}

function sameDefinition(
  source: UiCompositionInstanceManifest,
  target: UiCompositionInstanceManifest
): boolean {
  return (
    source.definitionName === target.definitionName &&
    source.definitionVersion === target.definitionVersion
  );
}

function instanceReference(instance: UiCompositionInstanceManifest): UiCompositionVersionReference {
  return { name: instance.definitionName, version: instance.definitionVersion };
}

function sameReference(
  source: UiCompositionVersionReference,
  target: UiCompositionVersionReference
): boolean {
  return source.name === target.name && source.version === target.version;
}

function migrationKey(
  source: UiCompositionVersionReference,
  target: UiCompositionVersionReference
): string {
  return JSON.stringify([source.name, source.version, target.name, target.version]);
}

function referenceKey(reference: UiCompositionVersionReference): string {
  return JSON.stringify([reference.name, reference.version]);
}

function nonEmpty(value: string): boolean {
  return value.length > 0;
}

function sortedRecord(source: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(source).sort(([left], [right]) => left.localeCompare(right))
  );
}

function migrationError(code: string): UiCompositionMigrationError {
  return new UiCompositionMigrationError(code);
}

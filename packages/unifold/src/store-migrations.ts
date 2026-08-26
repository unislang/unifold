import type { JsonValue } from "@unislang/unifold-contracts";

import type { UiAsyncStoreSnapshot, UiStoreDataMigration } from "./async-store-types.js";

const maximumMigrationSteps = 16;

export class UiStoreMigrationError extends Error {}

export function migrateUiStoreSnapshot(
  snapshot: UiAsyncStoreSnapshot,
  targetVersion: string,
  migrations: readonly UiStoreDataMigration[] = []
): UiAsyncStoreSnapshot {
  validateIdentity(snapshot.dataVersion, "source version");
  validateIdentity(snapshot.revision, "revision");
  validateIdentity(targetVersion, "target version");
  const edges = migrationEdges(migrations);
  const migrated = migrateValue(snapshot.value, snapshot.dataVersion, targetVersion, edges);
  return Object.freeze({
    dataVersion: targetVersion,
    revision: snapshot.revision,
    value: structuredClone(migrated)
  });
}

function migrationEdges(
  migrations: readonly UiStoreDataMigration[]
): ReadonlyMap<string, UiStoreDataMigration> {
  const edges = new Map<string, UiStoreDataMigration>();
  migrations.forEach((migration) => {
    validateMigration(migration);
    if (edges.has(migration.fromVersion)) throw migrationError("duplicate-edge");
    edges.set(migration.fromVersion, migration);
  });
  return edges;
}

function validateMigration(migration: UiStoreDataMigration): void {
  validateIdentity(migration.fromVersion, "migration source");
  validateIdentity(migration.toVersion, "migration target");
  if (migration.fromVersion === migration.toVersion) throw migrationError("cycle");
}

function migrateValue(
  initial: JsonValue,
  sourceVersion: string,
  targetVersion: string,
  edges: ReadonlyMap<string, UiStoreDataMigration>
): JsonValue {
  let value = structuredClone(initial);
  let version = sourceVersion;
  const visited = new Set<string>();
  for (let step = 0; version !== targetVersion; step += 1) {
    validateMigrationStep(step, version, visited);
    const migration = requireMigration(edges, version);
    value = applyMigration(value, migration);
    version = migration.toVersion;
  }
  return value;
}

function validateMigrationStep(step: number, version: string, visited: Set<string>): void {
  validateMigrationBudget(step);
  validateUnvisitedVersion(version, visited);
  visited.add(version);
}

function validateMigrationBudget(step: number): void {
  if (step >= maximumMigrationSteps) throw migrationError("budget-exceeded");
}

function validateUnvisitedVersion(version: string, visited: ReadonlySet<string>): void {
  if (visited.has(version)) throw migrationError("cycle");
}

function requireMigration(
  edges: ReadonlyMap<string, UiStoreDataMigration>,
  version: string
): UiStoreDataMigration {
  const migration = edges.get(version);
  if (migration === undefined) throw migrationError("missing-edge");
  return migration;
}

function applyMigration(value: JsonValue, migration: UiStoreDataMigration): JsonValue {
  try {
    const output = migration.migrate(structuredClone(value));
    return structuredClone(output);
  } catch {
    throw migrationError("migration-failed");
  }
}

function validateIdentity(value: string, label: string): void {
  const valid = [value.length > 0, value.length <= 256, [...value].every(visibleCharacter)];
  if (!valid.every(Boolean)) throw new UiStoreMigrationError(`Store ${label} is invalid.`);
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}

function migrationError(code: string): UiStoreMigrationError {
  return new UiStoreMigrationError(`Store migration failed: ${code}.`);
}

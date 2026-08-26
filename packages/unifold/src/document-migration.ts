import { UiSchemaVersion, type JsonObject } from "@unislang/unifold-contracts";
import { isJsonSafe } from "@unislang/unifold-ir";

import {
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentLoadLimit,
  UnifoldDocumentMigrationStatus,
  type MigratedUnifoldDocumentResult,
  type UnifoldDocumentMigration,
  type UnifoldDocumentMigrationRecord,
  type UnifoldDocumentMigrationResult
} from "./document-loading-types.js";
import { UnifoldApplicationDiagnosticStage, type UnifoldApplicationDiagnostic } from "./types.js";

class MigrationError extends Error {
  constructor(
    readonly code: UnifoldDocumentLoadDiagnosticCode,
    message: string,
    readonly path = "/schemaVersion"
  ) {
    super(message);
  }
}

export function migrateUnifoldDocument(
  input: JsonObject,
  migrations: readonly UnifoldDocumentMigration[],
  targetVersion: string = UiSchemaVersion.Version1
): UnifoldDocumentMigrationResult {
  try {
    return runMigrations(structuredClone(input), migrations, targetVersion);
  } catch (error) {
    return {
      diagnostic: migrationDiagnostic(error),
      status: UnifoldDocumentMigrationStatus.Rejected
    };
  }
}

function runMigrations(
  document: JsonObject,
  migrations: readonly UnifoldDocumentMigration[],
  targetVersion: string
): MigratedUnifoldDocumentResult {
  const originalSchemaVersion = requireVersion(document);
  const byVersion = indexMigrations(migrations);
  const records: UnifoldDocumentMigrationRecord[] = [];
  const seen = new Set<string>();
  let current = document;
  while (requireVersion(current) !== targetVersion) {
    current = migrateNext(current, byVersion, records, seen);
  }
  return {
    appliedMigrations: records,
    document: current,
    originalSchemaVersion,
    status: UnifoldDocumentMigrationStatus.Migrated
  };
}

function migrateNext(
  document: JsonObject,
  byVersion: ReadonlyMap<string, UnifoldDocumentMigration>,
  records: UnifoldDocumentMigrationRecord[],
  seen: Set<string>
): JsonObject {
  const version = requireVersion(document);
  assertBudget(records);
  assertUnseen(version, seen);
  const migration = requireMigration(byVersion, version);
  const output = applyMigration(document, migration);
  records.push({ fromVersion: migration.fromVersion, toVersion: migration.toVersion });
  return output;
}

function indexMigrations(
  migrations: readonly UnifoldDocumentMigration[]
): ReadonlyMap<string, UnifoldDocumentMigration> {
  const byVersion = new Map<string, UnifoldDocumentMigration>();
  for (const migration of migrations) {
    if (byVersion.has(migration.fromVersion)) throw duplicateMigration(migration.fromVersion);
    byVersion.set(migration.fromVersion, migration);
  }
  return byVersion;
}

function applyMigration(document: JsonObject, migration: UnifoldDocumentMigration): JsonObject {
  const output = invokeMigration(document, migration);
  assertMigrationOutput(output, migration);
  return structuredClone(output);
}

function invokeMigration(document: JsonObject, migration: UnifoldDocumentMigration): JsonObject {
  let output: JsonObject;
  try {
    output = migration.migrate(structuredClone(document));
  } catch {
    throw new MigrationError(
      UnifoldDocumentLoadDiagnosticCode.MigrationFailed,
      `Document migration failed: ${migration.fromVersion} to ${migration.toVersion}.`
    );
  }
  return output;
}

function assertMigrationOutput(output: JsonObject, migration: UnifoldDocumentMigration): void {
  assertMigrationJson(output, migration);
  assertMigrationSize(output, migration);
  if (requireVersion(output) !== migration.toVersion) throw invalidOutput(migration);
}

function assertMigrationJson(output: JsonObject, migration: UnifoldDocumentMigration): void {
  if (!validMigrationJson(output)) throw invalidOutput(migration);
}

function assertMigrationSize(output: JsonObject, migration: UnifoldDocumentMigration): void {
  if (migrationBytes(output) > UnifoldDocumentLoadLimit.MaxPayloadBytes)
    throw invalidOutput(migration);
}

function validMigrationJson(value: unknown): boolean {
  return [
    value !== null,
    typeof value === "object",
    !Array.isArray(value),
    isJsonSafe(value)
  ].every(Boolean);
}

function migrationBytes(value: JsonObject): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function requireVersion(document: JsonObject): string {
  const version = document["schemaVersion"];
  if (typeof version !== "string" || version.length === 0) {
    throw new MigrationError(
      UnifoldDocumentLoadDiagnosticCode.MigrationInvalidOutput,
      "A document migration requires a non-empty schemaVersion."
    );
  }
  return version;
}

function requireMigration(
  migrations: ReadonlyMap<string, UnifoldDocumentMigration>,
  version: string
): UnifoldDocumentMigration {
  const migration = migrations.get(version);
  if (migration === undefined) {
    throw new MigrationError(
      UnifoldDocumentLoadDiagnosticCode.MigrationMissing,
      `No trusted migration is registered from schema version ${version}.`
    );
  }
  return migration;
}

function assertBudget(records: readonly UnifoldDocumentMigrationRecord[]): void {
  if (records.length >= UnifoldDocumentLoadLimit.MaxMigrationSteps) {
    throw new MigrationError(
      UnifoldDocumentLoadDiagnosticCode.MigrationBudgetExceeded,
      "The document migration step budget was exceeded."
    );
  }
}

function assertUnseen(version: string, seen: Set<string>): void {
  if (seen.has(version)) {
    throw new MigrationError(
      UnifoldDocumentLoadDiagnosticCode.MigrationCycle,
      `The document migration graph cycles at schema version ${version}.`
    );
  }
  seen.add(version);
}

function duplicateMigration(version: string): MigrationError {
  return new MigrationError(
    UnifoldDocumentLoadDiagnosticCode.MigrationDuplicate,
    `More than one document migration starts at schema version ${version}.`
  );
}

function invalidOutput(migration: UnifoldDocumentMigration): MigrationError {
  return new MigrationError(
    UnifoldDocumentLoadDiagnosticCode.MigrationInvalidOutput,
    `Migration output did not declare schema version ${migration.toVersion}.`
  );
}

function migrationDiagnostic(error: unknown): UnifoldApplicationDiagnostic {
  const failure =
    error instanceof MigrationError
      ? error
      : new MigrationError(
          UnifoldDocumentLoadDiagnosticCode.MigrationFailed,
          "The document migration failed unexpectedly."
        );
  return {
    code: failure.code,
    message: failure.message,
    path: failure.path,
    stage: UnifoldApplicationDiagnosticStage.DocumentLoading
  };
}

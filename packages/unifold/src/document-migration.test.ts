import { UiSchemaVersion, type JsonObject } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { authoredDocument } from "./application.test-data.js";
import {
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentMigrationStatus,
  type UnifoldDocumentMigration
} from "./document-loading-types.js";
import { migrateUnifoldDocument } from "./document-migration.js";

it("keeps the current schema unchanged", () => {
  const document = authoredDocument();
  const result = migrateUnifoldDocument(document, []);
  expect(result.status).toBe(UnifoldDocumentMigrationStatus.Migrated);
  if (result.status !== UnifoldDocumentMigrationStatus.Migrated) return;
  expect(result.document).toEqual(document);
  expect(result.document).not.toBe(document);
  expect(result.appliedMigrations).toEqual([]);
});

it("applies a trusted migration to a defensive copy", () => {
  const document = legacyDocument();
  const result = migrateUnifoldDocument(document, [migration("0.9.0", "1.0.0")]);
  expect(result.status).toBe(UnifoldDocumentMigrationStatus.Migrated);
  if (result.status !== UnifoldDocumentMigrationStatus.Migrated) return;
  expect(result.document["schemaVersion"]).toBe(UiSchemaVersion.Version1);
  expect(document["schemaVersion"]).toBe("0.9.0");
  expect(result.appliedMigrations).toEqual([
    { fromVersion: "0.9.0", toVersion: UiSchemaVersion.Version1 }
  ]);
});

it("rejects a missing migration", () => {
  const result = migrateUnifoldDocument(legacyDocument(), []);
  expect(rejectionCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.MigrationMissing);
});

it("rejects duplicate migration sources", () => {
  const migrations = [migration("0.9.0", "1.0.0"), migration("0.9.0", "1.1.0")];
  const result = migrateUnifoldDocument(legacyDocument(), migrations);
  expect(rejectionCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.MigrationDuplicate);
});

it("rejects migration cycles", () => {
  const result = migrateUnifoldDocument(legacyDocument(), [migration("0.9.0", "0.9.0")]);
  expect(rejectionCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.MigrationCycle);
});

it("contains migration exceptions", () => {
  const broken: UnifoldDocumentMigration = {
    fromVersion: "0.9.0",
    migrate: () => {
      throw new Error("unsafe migration");
    },
    toVersion: "1.0.0"
  };
  const result = migrateUnifoldDocument(legacyDocument(), [broken]);
  expect(rejectionCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.MigrationFailed);
});

it("records an exact multi-edge compatibility path", () => {
  const document = { ...authoredDocument(), schemaVersion: "0.8.0" };
  const migrations = [migration("0.8.0", "0.9.0"), migration("0.9.0", "1.0.0")];
  const result = migrateUnifoldDocument(document, migrations);
  expect(result.status).toBe(UnifoldDocumentMigrationStatus.Migrated);
  if (result.status !== UnifoldDocumentMigrationStatus.Migrated) return;
  expect(result.appliedMigrations).toEqual([
    { fromVersion: "0.8.0", toVersion: "0.9.0" },
    { fromVersion: "0.9.0", toVersion: "1.0.0" }
  ]);
});

it("rejects invalid, cyclic, and oversized migration output", () => {
  const candidates = [
    outputMigration({ schemaVersion: "wrong" }),
    outputMigration(null),
    outputMigration(cyclicOutput()),
    outputMigration({ schemaVersion: "1.0.0", value: "x".repeat(1_000_000) })
  ];
  expect(
    candidates.every(
      (candidate) =>
        rejectionCode(migrateUnifoldDocument(legacyDocument(), [candidate])) ===
        UnifoldDocumentLoadDiagnosticCode.MigrationInvalidOutput
    )
  ).toBe(true);
});

it("rejects compatibility paths beyond the migration step budget", () => {
  const result = migrateUnifoldDocument(
    { ...authoredDocument(), schemaVersion: "0.0.0" },
    migrationChain(17),
    "17.0.0"
  );
  expect(rejectionCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.MigrationBudgetExceeded);
});

function legacyDocument(): JsonObject {
  return { ...authoredDocument(), schemaVersion: "0.9.0" };
}

function migration(fromVersion: string, toVersion: string): UnifoldDocumentMigration {
  return {
    fromVersion,
    migrate: (document) => ({ ...document, schemaVersion: toVersion }),
    toVersion
  };
}

function outputMigration(output: unknown): UnifoldDocumentMigration {
  return {
    fromVersion: "0.9.0",
    migrate: () => output as JsonObject,
    toVersion: "1.0.0"
  };
}

function cyclicOutput(): JsonObject {
  const output = { schemaVersion: "1.0.0" } as JsonObject & { self?: JsonObject };
  output.self = output;
  return output;
}

function migrationChain(length: number): UnifoldDocumentMigration[] {
  return Array.from({ length }, (_, index) => migration(`${index}.0.0`, `${index + 1}.0.0`));
}

function rejectionCode(result: ReturnType<typeof migrateUnifoldDocument>): string | undefined {
  return result.status === UnifoldDocumentMigrationStatus.Rejected
    ? result.diagnostic.code
    : undefined;
}

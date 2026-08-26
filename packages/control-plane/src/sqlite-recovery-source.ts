import canonicalize from "canonicalize";
import { DatabaseSync } from "node:sqlite";

import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import type { ControlPlaneRestoreVerificationPort } from "./encrypted-recovery-types.js";
import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import { parseSqliteJson, sqliteJson, sqliteText } from "./sqlite-store-helpers.js";
import { controlPlaneSqliteTransaction } from "./sqlite-transaction.js";

export interface SqliteControlPlaneRecoverySourceOptions {
  readonly database: DatabaseSync;
}

interface PortableTenantSnapshot extends JsonObject {
  readonly documents: readonly JsonObject[];
  readonly idempotency: readonly JsonObject[];
  readonly tenantId: string;
}

/** Exports SQLite tenant state and proves restoreability in a disposable scratch database. */
export class SqliteControlPlaneRecoverySource implements ControlPlaneRestoreVerificationPort {
  readonly #database: DatabaseSync;

  constructor(options: SqliteControlPlaneRecoverySourceOptions) {
    initializeControlPlaneSqlite(options.database);
    this.#database = options.database;
  }

  async exportTenant(tenantId: string, signal?: AbortSignal): Promise<JsonObject> {
    throwIfAborted(signal);
    return exportSnapshot(this.#database, tenantId);
  }

  async verifyRestore(tenantId: string, snapshot: JsonObject, signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    const validated = validateSnapshot(tenantId, snapshot);
    const scratch = new DatabaseSync(":memory:");
    try {
      initializeControlPlaneSqlite(scratch);
      controlPlaneSqliteTransaction(scratch, () => importSnapshot(scratch, validated));
      throwIfAborted(signal);
      if (canonicalize(exportSnapshot(scratch, tenantId)) !== canonicalize(validated)) {
        throw new Error("SQLite scratch restore did not round-trip exactly.");
      }
    } finally {
      scratch.close();
    }
  }
}

function exportSnapshot(database: DatabaseSync, tenantId: string): PortableTenantSnapshot {
  return {
    documents: exportDocuments(database, tenantId),
    idempotency: exportEffects(database, tenantId),
    tenantId
  };
}

function exportDocuments(database: DatabaseSync, tenantId: string): JsonObject[] {
  const rows = database
    .prepare(
      "SELECT revision_json AS value FROM unifold_control_plane_document " +
        "WHERE tenant_id = ? ORDER BY object_id"
    )
    .all(tenantId) as unknown as readonly { readonly value: unknown }[];
  return rows.map(({ value }) => {
    const revision = requireObject(parseSqliteJson(value), "document revision");
    return { objectId: sqliteText(revision["objectId"], "objectId"), revision };
  });
}

function exportEffects(database: DatabaseSync, tenantId: string): JsonObject[] {
  const rows = database
    .prepare(
      "SELECT idempotency_key, fingerprint, pending, result_json " +
        "FROM unifold_control_plane_effect WHERE tenant_id = ? ORDER BY idempotency_key"
    )
    .all(tenantId) as readonly Record<string, unknown>[];
  return rows.map((row) => ({
    fingerprint: sqliteText(row["fingerprint"], "fingerprint"),
    idempotencyKey: sqliteText(row["idempotency_key"], "idempotency_key"),
    pending: row["pending"] === 1,
    result: row["result_json"] === null ? null : parseSqliteJson<JsonValue>(row["result_json"])
  }));
}

function validateSnapshot(tenantId: string, snapshot: JsonObject): PortableTenantSnapshot {
  if (snapshot["tenantId"] !== tenantId) throw new TypeError("Recovery snapshot tenant mismatch.");
  const documents = requireObjectArray(snapshot["documents"], "documents");
  const idempotency = requireObjectArray(snapshot["idempotency"], "idempotency");
  documents.forEach((record) => validateDocument(tenantId, record));
  idempotency.forEach((record) => validateEffect(tenantId, record));
  return { documents, idempotency, tenantId };
}

function validateDocument(tenantId: string, record: JsonObject): void {
  const objectId = requireText(record["objectId"], "objectId");
  const revision = requireObject(record["revision"], "revision");
  if (revision["tenantId"] !== tenantId || revision["objectId"] !== objectId) {
    throw new TypeError("Recovery document identity mismatch.");
  }
}

function validateEffect(tenantId: string, record: JsonObject): void {
  requireText(record["idempotencyKey"], "idempotencyKey");
  requireText(record["fingerprint"], "fingerprint");
  if (typeof record["pending"] !== "boolean") throw new TypeError("Recovery pending is invalid.");
  validateEffectResult(tenantId, record["result"]);
}

function validateEffectResult(tenantId: string, result: JsonValue | undefined): void {
  if (result === undefined) throw new TypeError("Recovery effect result is invalid.");
  if (result === null) return;
  validateEffectValue(tenantId, requireObject(result, "effect result")["value"]);
}

function validateEffectValue(tenantId: string, value: JsonValue | undefined): void {
  if (value === undefined) return;
  if (requireObject(value, "effect value")["tenantId"] !== tenantId) {
    throw new TypeError("Recovery effect tenant mismatch.");
  }
}

function importSnapshot(database: DatabaseSync, snapshot: PortableTenantSnapshot): void {
  database
    .prepare("INSERT INTO unifold_control_plane_tenant(tenant_id) VALUES (?)")
    .run(snapshot.tenantId);
  snapshot.documents.forEach((record) => importDocument(database, snapshot.tenantId, record));
  snapshot.idempotency.forEach((record) => importEffect(database, snapshot.tenantId, record));
}

function importDocument(database: DatabaseSync, tenantId: string, record: JsonObject): void {
  database
    .prepare(
      "INSERT INTO unifold_control_plane_document(tenant_id, object_id, revision_json) VALUES (?, ?, ?)"
    )
    .run(tenantId, requireText(record["objectId"], "objectId"), sqliteJson(record["revision"]));
}

function importEffect(database: DatabaseSync, tenantId: string, record: JsonObject): void {
  database
    .prepare(
      "INSERT INTO unifold_control_plane_effect" +
        "(tenant_id, idempotency_key, fingerprint, pending, result_json) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      tenantId,
      requireText(record["idempotencyKey"], "idempotencyKey"),
      requireText(record["fingerprint"], "fingerprint"),
      record["pending"] === true ? 1 : 0,
      record["result"] === null ? null : sqliteJson(record["result"])
    );
}

function requireObjectArray(value: JsonValue | undefined, label: string): JsonObject[] {
  if (!Array.isArray(value) || value.length > 100_000) {
    throw new TypeError(`Recovery ${label} must be a bounded array.`);
  }
  return value.map((entry) => requireObject(entry, label));
}

function requireObject(value: JsonValue | undefined, label: string): JsonObject {
  const invalid = [typeof value !== "object", value === null, Array.isArray(value)];
  if (invalid.some(Boolean)) {
    throw new TypeError(`Recovery ${label} must be an object.`);
  }
  return value as JsonObject;
}

function requireText(value: JsonValue | undefined, label: string): string {
  const text = typeof value === "string" ? value : "";
  const invalid = [typeof value !== "string", text.length === 0, text.length > 4096];
  if (invalid.some(Boolean)) {
    throw new TypeError(`Recovery ${label} must be bounded text.`);
  }
  return text;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException("Recovery cancelled.", "AbortError");
}

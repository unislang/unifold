import type { DatabaseSync } from "node:sqlite";

import type { ControlPlaneFingerprintPort } from "./ports.js";
import type { ControlPlaneAuditEntry } from "./types.js";

export interface SqliteStoreContext {
  readonly database: DatabaseSync;
  readonly fingerprint: ControlPlaneFingerprintPort;
  readonly maxDocuments: number;
  readonly realtimeRetention: number;
}

export function ensureSqliteTenant(database: DatabaseSync, tenantId: string): void {
  database
    .prepare("INSERT OR IGNORE INTO unifold_control_plane_tenant(tenant_id) VALUES (?)")
    .run(tenantId);
}

export function nextSqliteCounter(
  database: DatabaseSync,
  tenantId: string,
  counter: "next_revision" | "next_sequence"
): number {
  ensureSqliteTenant(database, tenantId);
  const row = database
    .prepare(`SELECT ${counter} AS value FROM unifold_control_plane_tenant WHERE tenant_id = ?`)
    .get(tenantId) as { readonly value: number };
  database
    .prepare(
      `UPDATE unifold_control_plane_tenant SET ${counter} = ${counter} + 1 WHERE tenant_id = ?`
    )
    .run(tenantId);
  return row.value;
}

export function appendSqliteAudit(database: DatabaseSync, entry: ControlPlaneAuditEntry): void {
  ensureSqliteTenant(database, entry.tenantId);
  database
    .prepare("INSERT INTO unifold_control_plane_audit(tenant_id, entry_json) VALUES (?, ?)")
    .run(entry.tenantId, sqliteJson(entry));
}

export function sqliteJson(value: unknown): string {
  return JSON.stringify(value);
}

export function parseSqliteJson<TValue>(value: unknown): TValue {
  if (typeof value !== "string") throw new Error("SQLite JSON column is not text.");
  return JSON.parse(value) as TValue;
}

export function sqliteText(value: unknown, column: string): string {
  if (typeof value !== "string") throw new Error(`SQLite ${column} column is not text.`);
  return value;
}

export function sqliteNumber(value: unknown, column: string): number {
  if (typeof value !== "number") throw new Error(`SQLite ${column} column is not numeric.`);
  return value;
}

import type { DatabaseSync } from "node:sqlite";

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS unifold_control_plane_tenant (
    tenant_id TEXT PRIMARY KEY,
    next_revision INTEGER NOT NULL DEFAULT 1,
    next_sequence INTEGER NOT NULL DEFAULT 1
  ) STRICT;
  CREATE TABLE IF NOT EXISTS unifold_control_plane_document (
    tenant_id TEXT NOT NULL,
    object_id TEXT NOT NULL,
    revision_json TEXT NOT NULL,
    PRIMARY KEY (tenant_id, object_id),
    FOREIGN KEY (tenant_id) REFERENCES unifold_control_plane_tenant(tenant_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS unifold_control_plane_effect (
    tenant_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    pending INTEGER NOT NULL CHECK (pending IN (0, 1)),
    result_json TEXT,
    PRIMARY KEY (tenant_id, idempotency_key),
    FOREIGN KEY (tenant_id) REFERENCES unifold_control_plane_tenant(tenant_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS unifold_control_plane_audit (
    audit_id INTEGER PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    entry_json TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES unifold_control_plane_tenant(tenant_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS unifold_control_plane_realtime (
    tenant_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    message_json TEXT NOT NULL,
    PRIMARY KEY (tenant_id, sequence),
    FOREIGN KEY (tenant_id) REFERENCES unifold_control_plane_tenant(tenant_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS unifold_control_plane_outbox (
    tenant_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    message_json TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TEXT NOT NULL,
    lease_owner TEXT,
    lease_until TEXT,
    PRIMARY KEY (tenant_id, sequence),
    FOREIGN KEY (tenant_id) REFERENCES unifold_control_plane_tenant(tenant_id)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS unifold_control_plane_outbox_available
    ON unifold_control_plane_outbox(tenant_id, available_at, lease_until, sequence);
  CREATE TABLE IF NOT EXISTS unifold_control_plane_backup (
    backup_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    digest TEXT NOT NULL,
    documents_json TEXT NOT NULL,
    effects_json TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES unifold_control_plane_tenant(tenant_id)
  ) STRICT;
`;

export function initializeControlPlaneSqlite(database: DatabaseSync): void {
  database.exec(schema);
}

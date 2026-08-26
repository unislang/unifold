import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { initializeControlPlaneSqlite } from "./sqlite-schema.js";

it("creates the durable tenant, state, audit, realtime, outbox, and backup tables idempotently", () => {
  const database = new DatabaseSync(":memory:");
  initializeControlPlaneSqlite(database);
  initializeControlPlaneSqlite(database);
  const rows = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'unifold_%'")
    .all() as unknown as readonly { readonly name: string }[];
  expect(rows.map(({ name }) => name).sort()).toEqual([
    "unifold_control_plane_audit",
    "unifold_control_plane_backup",
    "unifold_control_plane_document",
    "unifold_control_plane_effect",
    "unifold_control_plane_outbox",
    "unifold_control_plane_realtime",
    "unifold_control_plane_tenant"
  ]);
  database.close();
});

import type { DatabaseSync } from "node:sqlite";

export function controlPlaneSqliteTransaction<TValue>(
  database: DatabaseSync,
  operation: () => TValue
): TValue {
  database.exec("BEGIN IMMEDIATE");
  try {
    const value = operation();
    database.exec("COMMIT");
    return value;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

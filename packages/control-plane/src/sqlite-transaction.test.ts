import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { controlPlaneSqliteTransaction } from "./sqlite-transaction.js";

it("commits successful work and rolls back the full transaction on failure", () => {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE evidence (value TEXT NOT NULL) STRICT");
  controlPlaneSqliteTransaction(database, () => database.exec("INSERT INTO evidence VALUES ('a')"));
  expect(() =>
    controlPlaneSqliteTransaction(database, () => {
      database.exec("INSERT INTO evidence VALUES ('b')");
      throw new Error("injected failure");
    })
  ).toThrow("injected failure");
  expect(database.prepare("SELECT value FROM evidence").all()).toEqual([{ value: "a" }]);
  database.close();
});

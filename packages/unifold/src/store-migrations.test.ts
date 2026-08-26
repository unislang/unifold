import type { JsonValue } from "@unislang/unifold-contracts";
import { expect, it, vi } from "vitest";

import type { UiStoreDataMigration } from "./async-store-types.js";
import { migrateUiStoreSnapshot, UiStoreMigrationError } from "./store-migrations.js";

it("applies exact trusted migration edges to defensive copies", () => {
  const input = { dataVersion: "1.0.0", revision: "revision-1", value: { fullName: "Ada" } };
  const migrate = vi.fn((value: JsonValue) => ({
    name: (value as { fullName: string }).fullName
  }));
  const result = migrateUiStoreSnapshot(input, "2.0.0", [
    { fromVersion: "1.0.0", migrate, toVersion: "2.0.0" }
  ]);
  expect(result).toEqual({
    dataVersion: "2.0.0",
    revision: "revision-1",
    value: { name: "Ada" }
  });
  expect(migrate).toHaveBeenCalledWith({ fullName: "Ada" });
  expect(result.value).not.toBe(input.value);
});

const migrationFailures: readonly (readonly [string, readonly UiStoreDataMigration[]])[] = [
  ["missing", []],
  [
    "duplicate",
    [
      { fromVersion: "1", migrate: (value) => value, toVersion: "2" },
      { fromVersion: "1", migrate: (value) => value, toVersion: "3" }
    ]
  ],
  ["cycle", [{ fromVersion: "1", migrate: (value) => value, toVersion: "1" }]],
  [
    "exception",
    [
      {
        fromVersion: "1",
        migrate: () => {
          throw new Error("private migration error");
        },
        toVersion: "2"
      }
    ]
  ]
];

it.each(migrationFailures)("contains a %s migration failure", (_label, migrations) => {
  expect(() =>
    migrateUiStoreSnapshot({ dataVersion: "1", revision: "revision-1", value: {} }, "2", migrations)
  ).toThrow(UiStoreMigrationError);
});

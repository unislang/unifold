import { CatalogPropertyType, getCoreDescriptor } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import {
  StorePathCompatibility,
  StoreSchemaCompilationStatus,
  compileStoreSchema,
  isSafeStorePointer,
  storePathCompatibility
} from "./store-schema.js";
import { dataGridValueSchema } from "./store-validation.test-data.js";

it("compiles local Draft 2020-12 schemas and resolves compatible paths", () => {
  const result = compileStoreSchema(schema());
  expect(result.status).toBe(StoreSchemaCompilationStatus.Valid);
  const compiled = requireSchema(result.schema);
  const property = requireValueProperty("TextField");
  expect(storePathCompatibility(compiled, "/name", property)).toBe(
    StorePathCompatibility.Compatible
  );
  expect(storePathCompatibility(compiled, "/missing", property)).toBe(
    StorePathCompatibility.Missing
  );
  expect(storePathCompatibility(compiled, "/subscribed", property)).toBe(
    StorePathCompatibility.Incompatible
  );
  expect(storePathCompatibility(compiled, "/subscribed", requireValueProperty("Checkbox"))).toBe(
    StorePathCompatibility.Compatible
  );
  expect(storePathCompatibility(compiled, "/skills", requireValueProperty("MultiSelect"))).toBe(
    StorePathCompatibility.Compatible
  );
  expect(storePathCompatibility(compiled, "/name", requireValueProperty("MultiSelect"))).toBe(
    StorePathCompatibility.Incompatible
  );
  expect(
    storePathCompatibility(compiled, "/invalidSkills", requireValueProperty("MultiSelect"))
  ).toBe(StorePathCompatibility.Incompatible);
  expect(storePathCompatibility(compiled, "/name", unsupportedProperty())).toBe(
    StorePathCompatibility.Incompatible
  );
});

it("accepts a scalar step binding for controlled workflow navigation", () => {
  const compiled = requireSchema(compileStoreSchema(schema()).schema);
  expect(storePathCompatibility(compiled, "/step", requireValueProperty("Wizard"))).toBe(
    StorePathCompatibility.Compatible
  );
});

it("requires a closed composite schema for bound DataGrid values", () => {
  const compiled = requireSchema(compileStoreSchema(schema()).schema);
  expect(storePathCompatibility(compiled, "/grid", requireValueProperty("DataGrid"))).toBe(
    StorePathCompatibility.Compatible
  );
  expect(storePathCompatibility(compiled, "/broadGrid", requireValueProperty("DataGrid"))).toBe(
    StorePathCompatibility.Incompatible
  );
});

it("rejects malformed and prototype-sensitive decoded pointers", () => {
  expect(isSafeStorePointer("/profile/name")).toBe(true);
  expect(isSafeStorePointer("/escaped~0token/~1constructor")).toBe(true);
  expect(isSafeStorePointer(`/${"a".repeat(2047)}`)).toBe(true);
  expect(isSafeStorePointer("constructor")).toBe(false);
  expect(isSafeStorePointer("/bad~2escape")).toBe(false);
  expect(isSafeStorePointer(`/${"a".repeat(2048)}`)).toBe(false);
  expect(isSafeStorePointer("/constructor/value")).toBe(false);
  expect(isSafeStorePointer("/nested/prototype/value")).toBe(false);
  expect(isSafeStorePointer("/__proto__/value")).toBe(false);
});

it("rejects unpinned, remote-reference, and malformed schemas", () => {
  expect(compileStoreSchema(null).status).toBe(StoreSchemaCompilationStatus.Invalid);
  expect(compileStoreSchema({ type: "object" }).status).toBe(StoreSchemaCompilationStatus.Invalid);
  expect(compileStoreSchema(remoteSchema()).message).toContain("remote references");
  expect(compileStoreSchema({ ...schema(), type: "not-a-type" }).status).toBe(
    StoreSchemaCompilationStatus.Invalid
  );
});

function schema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    properties: {
      name: { type: "string" },
      invalidSkills: { items: false, type: "array" },
      broadGrid: { type: "object" },
      grid: dataGridValueSchema(),
      skills: { items: { type: "string" }, type: "array" },
      step: { type: "string" },
      subscribed: { type: "boolean" }
    },
    type: "object"
  };
}

function unsupportedProperty() {
  return { ...requireValueProperty("TextField"), valueType: CatalogPropertyType.Enum };
}

function remoteSchema() {
  return {
    ...schema(),
    properties: { name: { $ref: "https://schemas.example.com/name.json" } }
  };
}

function requireSchema<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Compiled store schema is missing.");
  return value;
}

function requireValueProperty(component: string) {
  const property = getCoreDescriptor(component)?.properties.find(({ name }) => name === "value");
  if (property === undefined) throw new Error("Component value property is missing.");
  return property;
}

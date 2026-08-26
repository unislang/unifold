import { Ajv2020 } from "ajv/dist/2020.js";
import { expect, it } from "vitest";

import schema from "./layout-document.schema.json" with { type: "json" };
import { validateLayoutDocumentShape } from "./layout-validation.js";

it("publishes and applies the versioned layout authoring schema", () => {
  const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  expect(schema.$id).toBe("https://schemas.unifold.org/layout-document/1.0/schema.json");
  expect(validateSchema(validDocument())).toBe(true);
  expect(validateLayoutDocumentShape(validDocument())).toEqual([]);
  const external = { ...validDocument() };
  Reflect.deleteProperty(external, "layouts");
  expect(validateSchema(external)).toBe(true);
  expect(validateLayoutDocumentShape(external)).toEqual([]);
  const invalid = { ...validDocument(), executable: "alert(1)" };
  expect(validateSchema(invalid)).toBe(false);
  expect(validateLayoutDocumentShape(invalid)).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "/executable" })])
  );
});

function validDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "test-layout",
    layoutType: "test",
    layoutVersion: "1.0.0",
    layouts: [
      {
        layoutType: "test",
        template: { id: "root", type: "Stack" },
        variables: {},
        version: "1.0.0"
      }
    ],
    revision: "1",
    schemaVersion: "1.0.0",
    variables: {}
  };
}

import { expect, it } from "vitest";

import {
  layoutValueSourcePointer,
  layoutVariableSourcePointers
} from "./layout-source-pointers.js";

it("maps structural references to supplied variables or definition defaults", () => {
  const definition = { variables: { fields: {}, heading: {} } };
  const pointers = layoutVariableSourcePointers(definition, { fields: [] }, "/layouts/2");
  expect(pointers).toEqual({
    fields: "/variables/fields",
    heading: "/layouts/2/variables/heading/default"
  });
  expect(layoutValueSourcePointer("{{fields.items}}", "/fallback", pointers)).toBe(
    "/variables/fields/items"
  );
  expect(layoutValueSourcePointer({ $var: "fields" }, "/fallback", pointers)).toBe(
    "/variables/fields"
  );
  expect(layoutValueSourcePointer([], "/inline", pointers)).toBe("/inline");
  expect(layoutValueSourcePointer({ $var: "missing" }, "/fallback", pointers)).toBe("/fallback");
});

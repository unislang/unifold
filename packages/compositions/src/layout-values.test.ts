import { expect, it } from "vitest";

import type { CompositionDiagnostic } from "./types.js";
import { CompositionDiagnosticCode } from "./enums.js";
import {
  layoutValueSourcePointer,
  layoutVariableSourcePointers
} from "./layout-source-pointers.js";
import { isSafeLayoutName, resolveLayoutValue, resolveLayoutVariables } from "./layout-values.js";

it("resolves typed variables, defaults, and structural paths", () => {
  const diagnostics: CompositionDiagnostic[] = [];
  const variables = resolveLayoutVariables(
    {
      variables: {
        count: { default: 2, required: false, type: "number" },
        person: { required: true, type: "object" }
      }
    },
    { person: { name: "Ada" } },
    diagnostics
  );
  expect(diagnostics).toEqual([]);
  expect(variables).toEqual({ count: 2, person: { name: "Ada" } });
  expect(resolveLayoutValue("{{person.name}}", "/value", variables ?? {}, diagnostics)).toBe("Ada");
});

it("tracks supplied, default, and nested reference source pointers", () => {
  const definition = {
    variables: {
      fields: { type: "nodes" },
      heading: { default: "Default", type: "string" }
    }
  };
  const pointers = layoutVariableSourcePointers(definition, { fields: [] }, "/layouts/2");
  expect(pointers).toEqual({
    fields: "/variables/fields",
    heading: "/layouts/2/variables/heading/default"
  });
  expect(layoutValueSourcePointer({ $var: "fields" }, "/fallback", pointers)).toBe(
    "/variables/fields"
  );
  expect(layoutValueSourcePointer("{{fields.items}}", "/fallback", pointers)).toBe(
    "/variables/fields/items"
  );
});

it("rejects unknown, incorrectly typed, and prototype-path values", () => {
  const diagnostics: CompositionDiagnostic[] = [];
  expect(
    resolveLayoutVariables(
      { variables: { title: { required: true, type: "string" } } },
      { extra: true, title: 1 },
      diagnostics
    )
  ).toBeUndefined();
  resolveLayoutValue("{{constructor.name}}", "/value", {}, diagnostics);
  expect(diagnostics.map(({ code }) => code)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.InvalidLayoutVariable,
      CompositionDiagnosticCode.UnknownLayoutVariable
    ])
  );
  expect(isSafeLayoutName("constructor")).toBe(false);
});

it("rejects malformed variable schemas and covers every declared variable type", () => {
  const malformed: CompositionDiagnostic[] = [];
  expect(resolveLayoutVariables({ variables: [] }, {}, malformed)).toBeUndefined();
  expect(resolveLayoutVariables({ variables: {} }, [], malformed)).toBeUndefined();
  expect(
    resolveLayoutVariables(
      { variables: { broken: false, unsupported: { type: "date" } } },
      {},
      malformed
    )
  ).toBeUndefined();

  const diagnostics: CompositionDiagnostic[] = [];
  expect(
    resolveLayoutVariables(
      {
        variables: {
          array: { type: "array" },
          boolean: { type: "boolean" },
          nodes: { type: "nodes" },
          number: { type: "number" },
          object: { type: "object" },
          string: { type: "string" }
        }
      },
      { array: [], boolean: true, nodes: [], number: 1, object: {}, string: "ok" },
      diagnostics
    )
  ).toEqual({ array: [], boolean: true, nodes: [], number: 1, object: {}, string: "ok" });
  expect(diagnostics).toEqual([]);
});

it("resolves arrays and object references and rejects malformed or scalar traversal", () => {
  const diagnostics: CompositionDiagnostic[] = [];
  const variables = { person: { name: "Ada" }, scalar: "value" };
  expect(resolveLayoutValue(["{{person.name}}"], "/items", variables, diagnostics)).toEqual([
    "Ada"
  ]);
  expect(resolveLayoutValue({ $var: "person.name" }, "/person", variables, diagnostics)).toBe(
    "Ada"
  );
  expect(resolveLayoutValue({ $var: "not valid!" }, "/invalid", variables, diagnostics)).toBe(
    undefined
  );
  expect(resolveLayoutValue("{{scalar.part}}", "/scalar", variables, diagnostics)).toBeUndefined();
  expect(diagnostics).toHaveLength(2);
});

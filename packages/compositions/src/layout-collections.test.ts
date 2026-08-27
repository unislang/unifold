import { expect, it } from "vitest";

import { registerLayoutCollection } from "./layout-collections.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

it("registers only unique repeats over supplied authored variables", () => {
  const definitions: Record<string, LayoutCollectionDefinition> = {};
  const diagnostics: CompositionDiagnostic[] = [];
  expect(register("items", "/variables/items", definitions, diagnostics)).toBe(true);
  expect(definitions).toEqual({
    items: {
      controlId: "items",
      declarationPointer: "/node/collection",
      keyProperty: "id",
      sourcePointer: "/variables/items"
    }
  });
  expect(register("items", "/variables/other", definitions, diagnostics)).toBe(false);
  expect(register("aliases", "/variables/items", definitions, diagnostics)).toBe(false);
  expect(register("defaults", "/layouts/0/variables/items/default", definitions, diagnostics)).toBe(
    false
  );
  expect(diagnostics.map(({ path }) => path)).toEqual([
    "/node/collection",
    "/node/collection",
    "/node/collection"
  ]);
});

function register(
  name: string,
  pointer: string,
  definitions: Record<string, LayoutCollectionDefinition>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  return registerLayoutCollection(name, "id", pointer, "/node", definitions, diagnostics);
}

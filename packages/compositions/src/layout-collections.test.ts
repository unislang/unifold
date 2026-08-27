import type { JsonObject } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  registerLayoutCollection,
  validateLayoutCollectionFocusTargets
} from "./layout-collections.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

it("registers only unique repeats over supplied authored variables", () => {
  const definitions: Record<string, LayoutCollectionDefinition> = {};
  const diagnostics: CompositionDiagnostic[] = [];
  expect(register("items", "/variables/items", definitions, diagnostics, "add-item")).toBe(true);
  expect(definitions).toEqual({
    items: {
      controlId: "items",
      declarationPointer: "/node/collection",
      emptyFocusTargetId: "add-item",
      emptyFocusTargetPointer: "/node/emptyFocusTarget",
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

it("accepts nested focus destinations and rejects unusable empty-focus targets", () => {
  expect(
    targetValidation("add-area", {
      $children: [
        {
          $children: [{ $comp: "Button", id: "add-item" }],
          $comp: "Stack",
          id: "add-area"
        }
      ],
      $comp: "Stack",
      id: "root"
    }).valid
  ).toBe(true);

  const invalidTargets = [
    ["missing", { $comp: "Stack", id: "root" }],
    ["items", { $comp: "Button", id: "items" }],
    ["add-item", { $comp: "Button", disabled: true, id: "add-item" }],
    ["add-area", { $comp: "Stack", id: "add-area" }]
  ] as const;
  invalidTargets.forEach(([targetId, view]) => {
    const result = targetValidation(targetId, view);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.at(-1)).toMatchObject({ path: "/node/emptyFocusTarget" });
  });
});

function targetValidation(emptyFocusTargetId: string, view: JsonObject) {
  const definitions: Record<string, LayoutCollectionDefinition> = {};
  const diagnostics: CompositionDiagnostic[] = [];
  register("items", "/variables/items", definitions, diagnostics, emptyFocusTargetId);
  const valid = validateLayoutCollectionFocusTargets(
    view,
    { collectionsById: definitions },
    diagnostics
  );
  return { diagnostics, valid };
}

function register(
  name: string,
  pointer: string,
  definitions: Record<string, LayoutCollectionDefinition>,
  diagnostics: CompositionDiagnostic[],
  emptyFocusTargetId?: string
): boolean {
  return registerLayoutCollection(
    name,
    "id",
    emptyFocusTargetId,
    pointer,
    "/node",
    definitions,
    diagnostics
  );
}

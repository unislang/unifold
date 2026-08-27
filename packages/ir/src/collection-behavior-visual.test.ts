import { expect, it } from "vitest";

import {
  collectionHasFocusDestination,
  collectionVisualNodeIndex
} from "./collection-behavior-visual.js";

it("indexes nested visual focus destinations", () => {
  const nodes = collectionVisualNodeIndex({
    $children: [
      {
        $children: [{ $comp: "Button", id: "add-item" }],
        $comp: "Stack",
        id: "add-area"
      }
    ],
    $comp: "Form",
    id: "form"
  });

  expect(collectionHasFocusDestination("add-area", nodes)).toBe(true);
  expect(collectionHasFocusDestination("missing", nodes)).toBe(false);
});

it("rejects disabled and static-only visual destinations", () => {
  const disabled = collectionVisualNodeIndex({ $comp: "Button", disabled: true, id: "add" });
  const staticOnly = collectionVisualNodeIndex({ $comp: "Text", id: "message" });

  expect(collectionHasFocusDestination("add", disabled)).toBe(false);
  expect(collectionHasFocusDestination("message", staticOnly)).toBe(false);
});

import { expect, it } from "vitest";

import { appendReferenceFormStructure } from "./form-structure-reference.js";

it("appends the deferred form structures once in deterministic order", () => {
  const source = {
    compositions: [
      {
        template: {
          $children: [{ $children: [{ $comp: "TextField", id: "name" }], id: "form" }],
          id: "root"
        }
      }
    ]
  };
  appendReferenceFormStructure(source);
  appendReferenceFormStructure(source);
  const children = requireFormChildren(source);
  expect(children.map(({ id }) => id)).toEqual([
    "form-errors",
    "name",
    "preferred-name-field",
    "communication-preferences"
  ]);
});

function requireFormChildren(source: {
  compositions: { template: { $children: { $children: { id: string }[] }[] } }[];
}) {
  const composition = source.compositions.at(0);
  if (composition === undefined) throw new Error("Composition is missing.");
  const form = composition.template.$children.at(0);
  if (form === undefined) throw new Error("Form is missing.");
  return form.$children;
}

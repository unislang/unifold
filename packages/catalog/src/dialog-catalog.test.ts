import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { dialogDescriptor, MAXIMUM_DIALOG_CHILDREN } from "./dialog-catalog.js";
import { CatalogConstraintKind, CoreElementTag } from "./enums.js";

it("describes one bounded and accessibly named modal Dialog", () => {
  expect(dialogDescriptor).toMatchObject({
    componentType: CoreComponentType.Dialog,
    constraints: [
      {
        kind: CatalogConstraintKind.ChildCount,
        maximum: MAXIMUM_DIALOG_CHILDREN,
        minimum: 1
      }
    ],
    tagName: CoreElementTag.Dialog
  });
  expect(property("label").required).toBe(true);
  expect(property("dialogLabel").required).toBe(true);
  expect(property("dismissLabel").defaultValue).toBe("Close dialog");
});

function property(name: string) {
  const found = dialogDescriptor.properties.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`Missing ${name} property.`);
  return found;
}

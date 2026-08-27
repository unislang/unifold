import { expect, it } from "vitest";

import { buildControlChildren, logicalControlParentId } from "./normalized-control-topology.js";
import { controlNode } from "./test-helpers.js";

it("builds ordered logical children independently from visual parents", () => {
  const form = { ...controlNode("form", ""), controlChildIds: ["second", "first"] };
  const first = explicitChild(controlNode("first", "A", "wrapper"), "form", "first");
  const second = explicitChild(controlNode("second", "B", "wrapper"), "form", "second");
  const wrapper = controlNode("wrapper", "", "form");
  Reflect.deleteProperty(wrapper, "control");

  expect(buildControlChildren([form, wrapper, first, second])).toMatchObject({
    form: ["second", "first"]
  });
  expect(logicalControlParentId(first)).toBe("form");
});

it("rejects inconsistent explicit topology", () => {
  const form = { ...controlNode("form", ""), controlChildIds: ["field", "field"] };
  const field = explicitChild(controlNode("field", "A"), "form", "field");
  expect(() => buildControlChildren([form, field])).toThrow("Duplicate control child");
});

function explicitChild(
  node: ReturnType<typeof controlNode>,
  controlParentId: string,
  controlKey: string
) {
  return { ...node, controlChildIds: [], controlKey, controlParentId };
}

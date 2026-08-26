// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { coreElementDefinitions } from "./core-element-definitions.js";

it("maps every core tag to exactly one custom element constructor", () => {
  const tags = coreElementDefinitions.map(([tagName]) => tagName);
  expect(tags).toEqual(Object.values(CoreElementTag));
  expect(new Set(tags).size).toBe(tags.length);
});

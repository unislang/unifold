import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  ComponentProgrammaticFocusBehavior,
  componentProgrammaticFocusBehavior
} from "./programmatic-focus.js";

it("publishes an enum-backed focus behavior for every core component", () => {
  expect(Object.values(CoreComponentType).map(componentProgrammaticFocusBehavior)).toHaveLength(
    Object.values(CoreComponentType).length
  );
  expect(componentProgrammaticFocusBehavior(CoreComponentType.Button)).toBe(
    ComponentProgrammaticFocusBehavior.FirstFocusableDescendant
  );
  expect(componentProgrammaticFocusBehavior(CoreComponentType.Stack)).toBe(
    ComponentProgrammaticFocusBehavior.None
  );
});

it("fails unknown component types closed without widening the catalog", () => {
  expect(componentProgrammaticFocusBehavior("FutureComponent")).toBe(
    ComponentProgrammaticFocusBehavior.None
  );
  expect(ComponentProgrammaticFocusBehavior.FirstFocusableDescendant).toBe(
    "first-focusable-descendant"
  );
});

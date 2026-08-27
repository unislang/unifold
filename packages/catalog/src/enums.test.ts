import { expect, it } from "vitest";

import { DialogActivationReason, PaginationItemKind } from "./enums.js";

it("exports runtime enum-backed dialog vocabulary", () => {
  expect(DialogActivationReason.Escape).toBe("escape");
  expect(PaginationItemKind.Overflow).toBe("overflow");
});

import { expect, it } from "vitest";

import { DialogActivationReason } from "./enums.js";

it("exports runtime enum-backed dialog vocabulary", () => {
  expect(DialogActivationReason.Escape).toBe("escape");
});

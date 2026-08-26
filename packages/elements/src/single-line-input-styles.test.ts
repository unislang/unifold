import { expect, it } from "vitest";

import { singleLineInputStyles } from "./single-line-input-styles.js";

it("shares the token-backed single-line input style contract", () => {
  expect(singleLineInputStyles).toHaveLength(4);
  expect(singleLineInputStyles.map(String).join("\n")).toContain("--unifold-control-min-height");
});

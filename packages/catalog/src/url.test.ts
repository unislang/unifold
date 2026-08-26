import { expect, it } from "vitest";

import { isSafeUrl } from "./url.js";

it("accepts navigation URLs and rejects executable or malformed URLs", () => {
  [
    "/docs",
    "#details",
    "https://unifold.org",
    "mailto:hello@unifold.org",
    "tel:+15555550100"
  ].forEach((value) => expect(isSafeUrl(value)).toBe(true));
  ["javascript:alert(1)", "data:text/html,unsafe", "https://[invalid"].forEach((value) =>
    expect(isSafeUrl(value)).toBe(false)
  );
});

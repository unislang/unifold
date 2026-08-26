import { expect, it } from "vitest";

import { isSafeResourceUrl, isSafeUrl } from "./url.js";

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

it("restricts fetchable resources to relative and HTTP(S) URLs", () => {
  ["/media/profile.webp", "images/card.png", "https://cdn.example.test/card.avif"].forEach(
    (value) => expect(isSafeResourceUrl(value)).toBe(true)
  );
  ["data:image/svg+xml,unsafe", "javascript:alert(1)", "mailto:owner@example.test"].forEach(
    (value) => expect(isSafeResourceUrl(value)).toBe(false)
  );
});

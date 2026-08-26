import { expect, it } from "vitest";

import { escapeHtml } from "./html-escape.js";

it("escapes every HTML text and quoted-attribute delimiter", () => {
  expect(escapeHtml(`<script data-value="'&">`)).toBe(
    "&lt;script data-value=&quot;&#39;&amp;&quot;&gt;"
  );
});

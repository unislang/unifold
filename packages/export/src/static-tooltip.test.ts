import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { renderStaticTooltip } from "./static-tooltip.js";

it("renders escaped, described no-JavaScript Tooltip content", () => {
  const html = renderStaticTooltip({
    node: {
      childIds: [],
      componentType: "Tooltip",
      eventBindings: {},
      id: "help",
      kind: UiNodeKind.Component,
      properties: {
        content: "Delivery <excludes> holidays.",
        label: "Shipping & delivery",
        placement: "bottom"
      },
      scopePath: ["help"]
    }
  });

  expect(html).toContain('aria-describedby="help__tooltip"');
  expect(html).toContain('data-placement="bottom"');
  expect(html).toContain("Shipping &amp; delivery");
  expect(html).toContain("Delivery &lt;excludes&gt; holidays.");
});

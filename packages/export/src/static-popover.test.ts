import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { renderStaticPopover } from "./static-popover.js";

it("renders an escaped native no-JavaScript Popover disclosure with child content", () => {
  const html = renderStaticPopover({
    children: '<div data-child="safe">Account is active.</div>',
    node: {
      childIds: ["summary"],
      componentType: "Popover",
      eventBindings: {},
      id: "details",
      kind: UiNodeKind.Component,
      properties: {
        label: "Account <details>",
        panelLabel: "Current account & status",
        placement: "end"
      },
      scopePath: ["details"]
    }
  });

  expect(html).toContain('<details data-placement="end">');
  expect(html).toContain("Account &lt;details&gt;");
  expect(html).toContain('role="dialog" aria-label="Current account &amp; status"');
  expect(html).toContain('data-child="safe"');
});

it("uses deterministic string fallbacks for defensive rendering", () => {
  const html = renderStaticPopover({
    children: "",
    node: {
      childIds: [],
      componentType: "Popover",
      eventBindings: {},
      id: "fallback",
      kind: UiNodeKind.Component,
      properties: { label: 1, panelLabel: false, placement: null },
      scopePath: ["fallback"]
    }
  });
  expect(html).toContain('<details data-placement="bottom"><summary></summary>');
  expect(html).toContain('<section role="dialog" aria-label=""></section>');
});

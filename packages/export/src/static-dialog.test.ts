import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { renderStaticDialog } from "./static-dialog.js";

it("renders escaped Dialog content as a truthful no-JavaScript disclosure", () => {
  const html = renderStaticDialog({
    children: '<p data-child="safe">Review the change.</p>',
    node: {
      childIds: ["copy"],
      componentType: "Dialog",
      eventBindings: {},
      id: "confirm",
      kind: UiNodeKind.Component,
      properties: {
        dialogLabel: "Confirm <change>",
        dismissLabel: "Cancel",
        label: "Review & confirm"
      },
      scopePath: ["confirm"]
    }
  });
  expect(html).toContain("<details><summary>Review &amp; confirm</summary>");
  expect(html).toContain('role="dialog" aria-label="Confirm &lt;change&gt;"');
  expect(html).not.toContain('aria-modal="true"');
  expect(html).toContain('data-child="safe"');
});

it("uses empty defensive fallbacks for non-string labels", () => {
  const html = renderStaticDialog({
    children: "",
    node: {
      childIds: [],
      componentType: "Dialog",
      eventBindings: {},
      id: "fallback",
      kind: UiNodeKind.Component,
      properties: { dialogLabel: false, label: 1 },
      scopePath: ["fallback"]
    }
  });
  expect(html).toBe(
    '<details><summary></summary><section role="dialog" aria-label=""></section></details>'
  );
});

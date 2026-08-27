import { CoreComponentType } from "@unislang/unifold-contracts";
import { UiNodeKind, type UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { renderStaticToast } from "./static-toast.js";

it("renders persistent polite Toast semantics without an inert dismiss action", () => {
  const output = renderStaticToast(toastNode());
  expect(output).toContain('data-status="success"');
  expect(output).toContain('data-variant="solid"');
  expect(output).toContain('data-visible="true"');
  expect(output).toContain('role="status" aria-atomic="true"');
  expect(output).toContain("Profile &lt;ready&gt;");
  expect(output).toContain("Changes &amp; review");
  expect(output).not.toContain("<button");
});

it("omits live semantics for a statically hidden Toast", () => {
  const output = renderStaticToast(toastNode({ visible: false }));
  expect(output).toContain('data-visible="false" hidden');
  expect(output).not.toContain('role="status"');
  expect(output).not.toContain("Profile &lt;ready&gt;");
});

it("renders urgent Toast content with alert semantics", () => {
  const output = renderStaticToast(toastNode({ status: "warning", variant: "subtle" }));
  expect(output).toContain('role="alert" aria-atomic="true"');
});

function toastNode(properties = {}): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.Toast,
    eventBindings: {},
    id: "ready",
    kind: UiNodeKind.Component,
    parentId: "root",
    properties: {
      dismissible: true,
      dismissLabel: "Dismiss notification",
      label: "Profile <ready>",
      message: "Changes & review",
      status: "success",
      variant: "solid",
      ...properties
    },
    scopePath: ["ready"]
  };
}

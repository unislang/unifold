import { UiNodeKind, type JsonObject } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { renderStaticBreadcrumb } from "./static-breadcrumb.js";

it("renders an escaped labelled native ordered Breadcrumb fallback", () => {
  const html = renderStaticBreadcrumb({
    node: {
      childIds: [],
      componentType: "Breadcrumb",
      eventBindings: {},
      id: "account-breadcrumb",
      kind: UiNodeKind.Component,
      properties: {
        compact: false,
        items: [
          { href: "/", id: "home", label: "Home & start" },
          { id: "current", label: "Current <account>" }
        ],
        label: "Account breadcrumb",
        separator: "slash"
      },
      scopePath: ["account-breadcrumb"]
    }
  });
  expect(html).toContain('<nav aria-label="Account breadcrumb"><ol>');
  expect(html).toContain('<a href="/">Home &amp; start</a><span aria-hidden="true">/</span>');
  expect(html).toContain('<span aria-current="page">Current &lt;account&gt;</span>');
});

it("marks a linked current page and falls back defensively", () => {
  const html = renderStaticBreadcrumb({
    node: {
      childIds: [],
      componentType: "Breadcrumb",
      eventBindings: {},
      id: "fallback",
      kind: UiNodeKind.Component,
      properties: {
        items: [{ href: "javascript:alert(1)", id: "current", label: "Current" }]
      },
      scopePath: ["fallback"]
    }
  });
  expect(html).toContain('<nav aria-label=""><ol>');
  expect(html).toContain('<a href="#" aria-current="page">Current</a>');
});

it("defends against malformed item data and an unlinked ancestor", () => {
  const malformed = renderStaticBreadcrumb({ node: breadcrumbNode({ items: {} }) });
  const unlinked = renderStaticBreadcrumb({
    node: breadcrumbNode({
      items: [
        { id: "ancestor", label: "Ancestor" },
        { id: "current", label: "Current" }
      ]
    })
  });
  expect(malformed).toContain("<ol></ol>");
  expect(unlinked).toContain("<span>Ancestor</span>");
});

function breadcrumbNode(properties: JsonObject) {
  return {
    childIds: [],
    componentType: "Breadcrumb",
    eventBindings: {},
    id: "defensive",
    kind: UiNodeKind.Component,
    properties,
    scopePath: ["defensive"]
  };
}

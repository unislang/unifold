// @vitest-environment happy-dom
import {
  BreadcrumbSeparator,
  CoreElementTag,
  type BreadcrumbItem
} from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { componentNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType } from "./enums.js";
import { defineUnifoldBreadcrumb } from "./breadcrumb-entry.js";
import type { UnifoldBreadcrumb } from "./breadcrumb.js";

it("renders a labelled ordered hierarchy and emits native link activation", async () => {
  const breadcrumb = await mountedBreadcrumb();
  const events: UiEvent[] = [];
  breadcrumb.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const navigation = root(breadcrumb).querySelector("nav");
  const items = root(breadcrumb).querySelectorAll("li");
  const home = requireAnchor(breadcrumb, 0);
  home.addEventListener("click", (event) => event.preventDefault());
  home.click();

  expect(navigation?.getAttribute("aria-label")).toBe("Account breadcrumb");
  expect(items).toHaveLength(3);
  expect(root(breadcrumb).querySelector('[aria-current="page"]')?.textContent).toContain("Current");
  expect(root(breadcrumb).querySelectorAll('[part="separator"][aria-hidden="true"]')).toHaveLength(
    2
  );
  expect(events[0]).toMatchObject({
    data: { change: { href: "/", itemId: "home" } },
    type: ElementEventType.ComponentActivated
  });
  breadcrumb.remove();
});

it("supports a linked current page, compact spacing, and defensive unsafe URLs", async () => {
  const breadcrumb = await mountedBreadcrumb([
    { href: "/", id: "home", label: "Home" },
    { href: "javascript:alert(1)", id: "current", label: "Current" }
  ]);
  breadcrumb.compact = true;
  breadcrumb.separator = BreadcrumbSeparator.Slash;
  await breadcrumb.updateComplete;
  const current = requireAnchor(breadcrumb, 1);
  expect(current.getAttribute("aria-current")).toBe("page");
  expect(current.getAttribute("href")).toBe("#");
  expect(breadcrumb.hasAttribute("compact")).toBe(true);
  expect(root(breadcrumb).querySelector("[part=separator]")?.textContent).toBe("/");
  breadcrumb.remove();
});

it("ignores non-link, missing, and out-of-range activation targets", async () => {
  const breadcrumb = await mountedBreadcrumb();
  const events: UiEvent[] = [];
  breadcrumb.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const current = root(breadcrumb).querySelector<HTMLElement>("[part=current]");
  if (current === null) throw new Error("Current Breadcrumb item is missing.");
  current.click();
  current.dataset["breadcrumbIndex"] = "2";
  current.click();
  const home = requireAnchor(breadcrumb, 0);
  home.addEventListener("click", (event) => event.preventDefault());
  home.dataset["breadcrumbIndex"] = "99";
  home.click();
  expect(events).toEqual([]);
  breadcrumb.remove();
});

async function mountedBreadcrumb(items: readonly BreadcrumbItem[] = breadcrumbItems()) {
  defineUnifoldBreadcrumb(customElements);
  const element = document.createElement(CoreElementTag.Breadcrumb) as UnifoldBreadcrumb;
  element.eventNode = componentNode("account-breadcrumb", "Breadcrumb");
  element.runtimeContext = { documentId: "breadcrumb-test" };
  element.id = "account-breadcrumb";
  element.items = items;
  element.label = "Account breadcrumb";
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function breadcrumbItems(): readonly BreadcrumbItem[] {
  return [
    { href: "/", id: "home", label: "Home" },
    { href: "/accounts", id: "accounts", label: "Accounts" },
    { id: "current", label: "Current" }
  ];
}

function root(breadcrumb: UnifoldBreadcrumb): ShadowRoot {
  const value = breadcrumb.shadowRoot;
  if (value === null) throw new Error("Breadcrumb shadow root is missing.");
  return value;
}

function requireAnchor(breadcrumb: UnifoldBreadcrumb, index: number): HTMLAnchorElement {
  const value = root(breadcrumb).querySelector<HTMLAnchorElement>(
    `[data-breadcrumb-index="${String(index)}"]`
  );
  if (value === null) throw new Error(`Breadcrumb link ${String(index)} is missing.`);
  return value;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

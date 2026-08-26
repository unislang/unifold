// @vitest-environment happy-dom
import { LinkTarget } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { ElementEventName, ElementEventType, registerCoreElements, UnifoldLink } from "./index.js";
import { componentNode } from "./elements.test-data.js";

it("renders a secure native link and emits canonical activation", async () => {
  const link = await mountLink();
  link.eventNode = componentNode("docs", "Link");
  link.href = "#documentation";
  link.label = "Documentation";
  link.target = LinkTarget.Blank;
  await link.updateComplete;
  const events: UiEvent[] = [];
  link.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const anchor = nativeLink(link);
  anchor.addEventListener("click", preventNavigation);
  anchor.click();
  expect(anchor.rel).toBe("noopener noreferrer");
  expect(events[0]).toMatchObject({
    type: ElementEventType.ComponentActivated,
    data: { change: { href: "#documentation", target: LinkTarget.Blank } }
  });
});

it("defends against unsafe href assignment outside the compiler", async () => {
  const link = await mountLink();
  link.href = "javascript:alert(1)";
  await link.updateComplete;
  expect(nativeLink(link).getAttribute("href")).toBe("#");
});

async function mountLink(): Promise<UnifoldLink> {
  registerCoreElements();
  const element = document.createElement("unifold-link") as UnifoldLink;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function nativeLink(element: UnifoldLink): HTMLAnchorElement {
  const link = element.shadowRoot?.querySelector("a");
  if (!(link instanceof HTMLAnchorElement)) throw new Error("Link was not rendered.");
  return link;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function preventNavigation(event: Event): void {
  event.preventDefault();
}

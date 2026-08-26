// @vitest-environment happy-dom
import { CoreElementTag, TooltipPlacement } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { UnifoldTooltip } from "./tooltip.js";
import { defineUnifoldTooltip } from "./tooltip-entry.js";

it("opens from focus and pointer, dismisses with Escape, and keeps focus", async () => {
  const element = tooltipElement();
  element.id = "help";
  element.label = "Shipping information";
  element.content = "Delivery excludes holidays.";
  document.body.append(element);
  await element.updateComplete;
  const trigger = requireElement<HTMLButtonElement>(element, "button");
  const tooltip = requireElement<HTMLElement>(element, "[role='tooltip']");

  trigger.focus();
  await element.updateComplete;
  expect(tooltip.dataset["open"]).toBe("");
  expect(trigger.getAttribute("aria-describedby")).toBe("help__tooltip");
  trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  await element.updateComplete;
  expect(tooltip.dataset["open"]).toBeUndefined();
  expect(element.shadowRoot?.activeElement).toBe(trigger);
  trigger.dispatchEvent(new PointerEvent("pointerenter"));
  await element.updateComplete;
  expect(tooltip.dataset["open"]).toBe("");
  element.remove();
});

it("uses exact default properties and closes on an outside pointer", async () => {
  const element = tooltipElement();
  element.id = "defaults";
  document.body.append(element);
  await element.updateComplete;
  const trigger = requireElement<HTMLButtonElement>(element, "button");
  const tooltip = requireElement<HTMLElement>(element, "[role='tooltip']");
  expect(element.placement).toBe(TooltipPlacement.Top);
  trigger.focus();
  await element.updateComplete;
  document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
  await element.updateComplete;
  expect(tooltip.dataset["open"]).toBeUndefined();
  element.remove();
});

it("handles id attributes, repeated state, non-Escape keys, blur, and pointer boundaries", async () => {
  const element = tooltipElement();
  document.body.append(element);
  element.attributeChangedCallback("id", null, "coverage");
  element.setAttribute("content", "Attribute content");
  element.open = false;
  await element.updateComplete;
  const trigger = requireElement<HTMLButtonElement>(element, "button");
  const tooltip = requireElement<HTMLElement>(element, "[role='tooltip']");
  trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  trigger.dispatchEvent(new PointerEvent("pointerenter"));
  element.open = true;
  trigger.dispatchEvent(new FocusEvent("blur"));
  expect(element.open).toBe(true);
  tooltip.dispatchEvent(new PointerEvent("pointerleave"));
  await element.updateComplete;
  expect(element.open).toBe(false);
  trigger.focus();
  await element.updateComplete;
  trigger.dispatchEvent(new FocusEvent("blur"));
  await element.updateComplete;
  expect(element.open).toBe(false);
  element.remove();
});

it("uses RTL positioning and tolerates a throwing Popover API", async () => {
  const direction = vi.spyOn(window, "getComputedStyle").mockReturnValue({
    direction: "rtl"
  } as CSSStyleDeclaration);
  const element = tooltipElement();
  document.body.append(element);
  await element.updateComplete;
  const trigger = requireElement<HTMLButtonElement>(element, "button");
  const tooltip = requireElement<HTMLElement>(element, "[role='tooltip']");
  Object.defineProperty(tooltip, "showPopover", {
    configurable: true,
    value: () => {
      throw new Error("unsupported");
    }
  });
  trigger.click();
  await element.updateComplete;
  expect(direction).toHaveBeenCalled();
  element.remove();
  direction.mockRestore();
});

it("tolerates throwing hide and missing Popover APIs", async () => {
  const element = tooltipElement();
  document.body.append(element);
  await element.updateComplete;
  const tooltip = requireElement<HTMLElement>(element, "[role='tooltip']");
  Object.defineProperty(tooltip, "hidePopover", {
    configurable: true,
    value: () => {
      throw new Error("unsupported");
    }
  });
  element.open = false;
  await element.updateComplete;
  const originalMatches = tooltip.matches.bind(tooltip);
  tooltip.matches = (selector: string) =>
    selector === ":popover-open" ? true : originalMatches(selector);
  element.open = true;
  await element.updateComplete;
  element.open = false;
  await element.updateComplete;
  Object.defineProperty(tooltip, "showPopover", { configurable: true, value: undefined });
  Object.defineProperty(tooltip, "hidePopover", { configurable: true, value: undefined });
  element.open = true;
  await element.updateComplete;
  element.open = false;
  await element.updateComplete;
  element.remove();
});

it("skips positioning when its owner document has no browsing context", async () => {
  const detachedDocument = document.implementation.createHTMLDocument("detached");
  const element = tooltipElement();
  detachedDocument.body.append(element);
  element.open = true;
  await element.updateComplete;
  expect(detachedDocument.defaultView).toBeNull();
  expect(element.open).toBe(true);
  element.remove();
});

function requireElement<T extends Element>(host: UnifoldTooltip, selector: string): T {
  const root = host.shadowRoot;
  if (root === null) throw new Error(`Missing ${selector}.`);
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}

function tooltipElement(): UnifoldTooltip {
  defineUnifoldTooltip(customElements);
  return document.createElement(CoreElementTag.Tooltip) as UnifoldTooltip;
}

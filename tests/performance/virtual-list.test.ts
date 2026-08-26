// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  VIRTUAL_LIST_ITEM_COUNT,
  VIRTUAL_LIST_RENDER_LIMIT,
  disposeVirtualList,
  mountVirtualList
} from "./virtual-list-fixture.js";

it("mounts 10k JSON options with bounded DOM and committed selection", async () => {
  const mounted = await mountVirtualList();
  try {
    await verifyVirtualList(mounted);
  } finally {
    disposeVirtualList(mounted);
  }
});

async function verifyVirtualList(mounted: Awaited<ReturnType<typeof mountVirtualList>>) {
  const viewport = requireViewport(mounted.element);
  expect(renderedRows(mounted.element)).toBeLessThanOrEqual(VIRTUAL_LIST_RENDER_LIMIT);
  expect(optionSize(mounted.element)).toBe(VIRTUAL_LIST_ITEM_COUNT);
  viewport.focus();
  viewport.scrollTop = 9_000 * mounted.element.itemHeight;
  viewport.dispatchEvent(new Event("scroll"));
  await mounted.element.updateComplete;
  expect(snapshotValue(mounted)).toBe("item-00010");
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await mounted.element.updateComplete;
  expect(snapshotValue(mounted)).toBe("item-08996");
  expect(mounted.element.value).toBe("item-08996");
  expect(mounted.element.shadowRoot?.activeElement).toBe(viewport);
}

function requireViewport(element: HTMLElement): HTMLElement {
  const viewport = element.shadowRoot?.querySelector<HTMLElement>("[part=viewport]");
  if (!(viewport instanceof HTMLElement)) throw new Error("Viewport is missing.");
  return viewport;
}

function renderedRows(element: HTMLElement): number {
  return element.shadowRoot?.querySelectorAll("[role=option]").length ?? 0;
}

function optionSize(element: HTMLElement): number {
  const option = element.shadowRoot?.querySelector<HTMLElement>("[role=option]");
  return Number(option?.getAttribute("aria-setsize"));
}

function snapshotValue(mounted: Awaited<ReturnType<typeof mountVirtualList>>) {
  return mounted.application.runtime.getSnapshot("records").control?.value;
}

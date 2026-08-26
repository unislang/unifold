// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  COMBOBOX_OPTION_COUNT,
  COMBOBOX_RENDER_LIMIT,
  disposeCombobox,
  filterCombobox,
  mountCombobox,
  renderedComboboxOptions
} from "./combobox-filter-fixture.js";

it("filters 10k options with bounded DOM and commits a distant registered value", async () => {
  const mounted = await mountCombobox();
  try {
    await filterCombobox(mounted.element, "Record");
    expect(renderedComboboxOptions(mounted.element)).toBe(COMBOBOX_RENDER_LIMIT);
    expect(firstOption(mounted.element)?.getAttribute("aria-setsize")).toBe(
      String(COMBOBOX_OPTION_COUNT)
    );
    expect(snapshotValue(mounted)).toBe("item-00010");

    await filterCombobox(mounted.element, "Record 09999");
    expect(renderedComboboxOptions(mounted.element)).toBe(1);
    requireInput(mounted.element).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await mounted.element.updateComplete;
    expect(snapshotValue(mounted)).toBe("item-09999");
  } finally {
    disposeCombobox(mounted);
  }
});

function firstOption(element: HTMLElement): HTMLElement | null {
  return element.shadowRoot?.querySelector<HTMLElement>("[role=option]") ?? null;
}

function requireInput(element: HTMLElement): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Combobox input is missing.");
  return input;
}

function snapshotValue(mounted: Awaited<ReturnType<typeof mountCombobox>>) {
  return mounted.application.runtime.getSnapshot("records").control?.value;
}

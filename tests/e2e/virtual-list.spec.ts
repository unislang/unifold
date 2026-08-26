import { expect, test } from "@unislang/unifold-playwright";

test("virtualizes 10,000 options with stable focus and selection", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(installVirtualList);
  expect(result.status, JSON.stringify(result)).toBe("applied");

  const list = page.locator("#app unifold-virtual-list");
  const viewport = list.locator("[part=viewport]");
  await expect(list).toHaveCount(1);
  expect(await list.getByRole("option").count()).toBeLessThanOrEqual(200);
  await expect(list.getByRole("option").first()).toHaveAttribute("aria-setsize", "10000");

  await viewport.focus();
  await scrollViewport(viewport, 9_000 * 32);
  await expect(list.getByText("Item 9000", { exact: true })).toBeVisible();
  expect(await list.evaluate((element) => Reflect.get(element, "value"))).toBe("item-00010");
  await expect(viewport).toBeFocused();

  await scrollViewport(viewport, 0);
  await expect(list.locator('[role=option][aria-selected="true"]')).toHaveText("Item 10");
  await scrollViewport(viewport, 9_000 * 32);
  await viewport.press("Enter");
  expect(await list.evaluate((element) => Reflect.get(element, "value"))).toBe("item-08996");
  await expect(viewport).toBeFocused();
});

async function scrollViewport(viewport: import("@playwright/test").Locator, scrollTop: number) {
  await viewport.evaluate((element, top) => {
    element.scrollTop = top;
    element.dispatchEvent(new Event("scroll"));
  }, scrollTop);
}

function installVirtualList() {
  const target = window as unknown as ReferenceWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.view = {
    $comp: "VirtualList",
    id: source.view.id,
    itemHeight: 32,
    label: "Records",
    options: Array.from({ length: 10_000 }, (_, index) => ({
      label: `Item ${index}`,
      value: `item-${String(index).padStart(5, "0")}`
    })),
    overscan: 4,
    value: "item-00010",
    viewportHeight: 480
  };
  return target.__unifoldUpdateDocument(source);
}

interface ReferenceWindow {
  readonly __unifoldAuthoredDocument: ReferenceDocument;
  readonly __unifoldUpdateDocument: (source: ReferenceDocument) => {
    readonly diagnostics?: readonly unknown[];
    readonly status: string;
  };
}

interface ReferenceDocument extends Record<string, unknown> {
  view: Record<string, unknown> & { id: string };
}

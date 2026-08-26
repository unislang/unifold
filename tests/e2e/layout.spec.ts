import { expect, readRenderBaseline, test } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

type ScenarioPage = Parameters<typeof readRenderBaseline>[0];

test("renders nested token-based Box, Stack, and Grid primitives", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Help and support").click();
  const box = nodeHost(page, compositionNodeIds.helpBox);
  const stack = nodeHost(page, compositionNodeIds.helpStack);
  const grid = nodeHost(page, compositionNodeIds.helpGrid);
  await expect(box).toHaveCount(1);
  await expect(stack).toHaveCount(1);
  await expect(grid).toHaveCount(1);
  expect(await childIds(box)).toEqual([compositionNodeIds.helpStack]);
  expect(await childIds(stack)).toEqual([
    compositionNodeIds.supportIcon,
    compositionNodeIds.supportHeading,
    compositionNodeIds.supportCopy,
    compositionNodeIds.supportAlert,
    compositionNodeIds.supportLink,
    compositionNodeIds.helpGrid
  ]);
  expect(await childIds(grid)).toHaveLength(2);
  const boxStyle = await containerStyle(box);
  const stackStyle = await containerStyle(stack);
  const gridStyle = await containerStyle(grid);
  expect(boxStyle.padding).not.toBe("0px");
  expect(boxStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(stackStyle).toMatchObject({ display: "flex", flexDirection: "column" });
  expect(gridStyle.display).toBe("grid");
  expect(gridStyle.gridTemplateColumns.split(" ")).toHaveLength(2);
});

function nodeHost(page: ScenarioPage, id: string) {
  return page.locator(`[data-unifold-node-id="${id}"]`);
}

async function childIds(locator: ReturnType<typeof nodeHost>): Promise<string[]> {
  return locator.evaluate((host) => {
    return [...host.children].map((child) => (child as HTMLElement).dataset["unifoldNodeId"] ?? "");
  });
}

async function containerStyle(locator: ReturnType<typeof nodeHost>) {
  return locator.evaluate((host) => {
    const container = host.shadowRoot?.querySelector('[part="container"]');
    if (!(container instanceof HTMLElement)) throw new Error("Layout container is missing.");
    const style = getComputedStyle(container);
    return {
      backgroundColor: style.backgroundColor,
      display: style.display,
      flexDirection: style.flexDirection,
      gridTemplateColumns: style.gridTemplateColumns,
      padding: style.padding
    };
  });
}

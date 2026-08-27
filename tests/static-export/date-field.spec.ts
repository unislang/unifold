import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("exports a constrained native DateField fallback", async ({ page }) => {
    await page.goto("/");
    const control = page.getByLabel("Start date");
    await expect(control).toHaveAttribute("type", "date");
    await expect(control).toHaveAttribute("autocomplete", "off");
    await expect(control).toHaveAttribute("min", "2025-01-01");
    await expect(control).toHaveAttribute("max", "2027-12-31");
    await expect(control).toHaveAttribute("step", "1");
    await expect(control).toHaveAttribute("required", "");
    await expect(control).toHaveValue("2026-08-26");
    expect(await submittedDate(control)).toBe("2026-08-26");
  });
});

test("migrates an edited DateField without converting its date-only value", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Start date");
  await fallback.fill("2026-09-03");
  await fallback.focus();
  expect(await nativeContract(fallback)).toEqual({
    autocomplete: "off",
    disabled: false,
    max: "2027-12-31",
    min: "2025-01-01",
    name: "startDate",
    readOnly: false,
    required: true,
    step: "1",
    type: "date",
    value: "2026-09-03"
  });
  await installUpgrade(page);
  const control = page.getByLabel("Start date");
  await expect(control).toHaveValue("2026-09-03");
  await expect(control).toBeFocused();
  await expect(page.locator('[data-unifold-node-id="start-date"]')).toHaveCount(1);
  expect(await submittedDate(control)).toBe("2026-09-03");
  await clearEvents(page);
  await control.fill("2026-10-15");
  await expect.poll(() => latestDateValue(page)).toBe("2026-10-15");
  expect(await submittedDate(control)).toBe("2026-10-15");
});

test("rejects a non-date fallback without replacing it", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Start date");
  await fallback.evaluate((element) => element.setAttribute("type", "text"));
  await expectRejectedUpgrade(page);
  await expect(fallback).toHaveAttribute("type", "text");
  await expect(page.locator('[data-unifold-node-id="start-date"]')).toHaveCount(0);
});

test("rejects tampered DateField constraints without replacing the fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Start date");
  await fallback.evaluate((element) => element.setAttribute("min", "2024-01-01"));
  await expectRejectedUpgrade(page);
  await expect(fallback).toHaveAttribute("min", "2024-01-01");
  await expect(page.locator('[data-unifold-node-id="start-date"]')).toHaveCount(0);
});

async function expectRejectedUpgrade(page: Page): Promise<void> {
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
}

async function installUpgrade(page: Page): Promise<void> {
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [], status: "mounted" });
}

async function installUpgradeScript(page: Page): Promise<void> {
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect
    .poll(() => page.evaluate(() => typeof window.__unifoldUpgradeStatic))
    .toBe("function");
}

async function submittedDate(control: Locator): Promise<string | null> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form = Reflect.get(
      root instanceof ShadowRoot ? root.host : element,
      "form"
    ) as HTMLFormElement | null;
    if (form === null) throw new Error("DateField form owner is missing.");
    return new FormData(form).get("startDate") as string | null;
  });
}

async function nativeContract(control: Locator) {
  return control.evaluate((element: HTMLInputElement) => ({
    autocomplete: element.autocomplete,
    disabled: element.disabled,
    max: element.max,
    min: element.min,
    name: element.name,
    readOnly: element.readOnly,
    required: element.required,
    step: element.step,
    type: element.getAttribute("type"),
    value: element.value
  }));
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function latestDateValue(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(
        ({ data, type }) =>
          type === "org.unifold.ui.control.input.v1" &&
          Reflect.get(Object(Reflect.get(Object(data), "sourceNode")), "id") === "start-date"
      );
    return Reflect.get(Object(event?.data.change), "value") as unknown;
  });
}

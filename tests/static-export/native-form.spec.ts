import { expect, test, type Locator, type Page } from "@playwright/test";

test("preserves boolean and repeated native form state through static upgrade", async ({
  page
}) => {
  await page.goto("/?upgrade=manual");
  const checkbox = page.getByLabel("Receive product updates");
  const skills = page.getByLabel("Skills");
  await checkbox.check();
  await skills.selectOption(["ts", "a11y"]);
  await skills.focus();
  expect(await nativeFormValues(checkbox)).toEqual({
    newsletter: ["on"],
    skills: ["ts", "a11y"]
  });
  await installUpgrade(page);
  await expect(page.getByLabel("Receive product updates")).toBeChecked();
  await expect(page.getByLabel("Skills")).toHaveValues(["ts", "a11y"]);
  await expect(page.getByLabel("Skills")).toBeFocused();
  expect(await nativeFormValues(page.getByLabel("Skills"))).toEqual({
    newsletter: ["on"],
    skills: ["ts", "a11y"]
  });
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
  await page.getByLabel("Receive product updates").uncheck();
  await page.getByLabel("Skills").selectOption("a11y");
  expect(await controlInputCount(page)).toBe(2);
});

async function installUpgrade(page: Page): Promise<void> {
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect.poll(() => hasUpgradeHook(page)).toBe(true);
  await page.evaluate(() => window.__unifoldUpgradeStatic());
}

function hasUpgradeHook(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof window.__unifoldUpgradeStatic === "function");
}

async function nativeFormValues(control: Locator) {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form =
      root instanceof ShadowRoot
        ? (root.host as HTMLElement & { readonly form: HTMLFormElement | null }).form
        : (element as HTMLInputElement | HTMLSelectElement).form;
    if (form === null) throw new Error("Native form owner is missing.");
    const data = new FormData(form);
    return {
      newsletter: data.getAll("newsletter").map(String),
      skills: data.getAll("skills").map(String)
    };
  });
}

function controlInputCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      window.__unifoldStaticEvents.filter(({ type }) => type === "org.unifold.ui.control.input.v1")
        .length
  );
}

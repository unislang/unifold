import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { expect, test } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

test("reveals bounded contextual help without moving focus", async ({ page, unifold }) => {
  await page.goto("/");
  const host = page.getByTestId("account-actions-help");
  const trigger = host.getByRole("button", { name: "About account actions" });
  const tooltip = host.getByRole("tooltip");
  await rememberIdentity(host);
  await exerciseTooltip(page, trigger, tooltip);
  await unifold.assertAccessibility();
  expect(
    (await unifold.events()).filter(
      (event) => event.data.sourceNode?.id === compositionNodeIds.accountActionsHelp
    )
  ).toEqual([]);
  await assertRejectionRecovery(page, host);
});

async function exerciseTooltip(
  page: import("@playwright/test").Page,
  trigger: import("@playwright/test").Locator,
  tooltip: import("@playwright/test").Locator
): Promise<void> {
  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText("Account actions affect the currently selected tenant.");
  await expect(trigger).toHaveAttribute(
    "aria-describedby",
    `${compositionNodeIds.accountActionsHelp}__tooltip`
  );
  await trigger.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.evaluate((element) => (element as HTMLElement).blur());
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();
  await trigger.focus();
  await expect(tooltip).toBeVisible();
}

async function assertRejectionRecovery(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await updateTooltip(page, true);
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(rejected.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "invalid-property" })])
  );
  expect(await retainedIdentity(host)).toBe(true);
  expect((await updateTooltip(page, false)).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(host.getByRole("button", { name: "Updated account action help" })).toHaveCount(1);
  await host.getByRole("button", { name: "Updated account action help" }).focus();
  await expect(host.getByRole("tooltip")).toHaveText("Updated tenant-scoped help.");
  expect(await retainedIdentity(host)).toBe(true);
}

async function rememberIdentity(host: import("@playwright/test").Locator): Promise<void> {
  await host.evaluate((element) => {
    (window as unknown as TooltipWindow).__unifoldStableTooltip = element;
  });
}

async function retainedIdentity(host: import("@playwright/test").Locator): Promise<boolean> {
  return host.evaluate(
    (element) => (window as unknown as TooltipWindow).__unifoldStableTooltip === element
  );
}

function updateTooltip(page: import("@playwright/test").Page, invalid: boolean) {
  return page.evaluate((reject) => {
    const target = window as unknown as TooltipWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument) as TooltipDocument;
    source.revision = reject ? "tooltip-invalid" : "tooltip-recovered";
    const tooltip = source.compositions[0].template.$children[4] as TooltipNode;
    tooltip.content = "Updated tenant-scoped help.";
    tooltip.label = "Updated account action help";
    tooltip.placement = reject ? "center" : "bottom";
    return target.__unifoldUpdateDocument(source);
  }, invalid);
}

interface TooltipWindow {
  readonly __unifoldAuthoredDocument: TooltipDocument;
  readonly __unifoldUpdateDocument: (source: TooltipDocument) => UpdateResult;
  __unifoldStableTooltip?: Element;
}

interface TooltipDocument {
  readonly compositions: readonly [{ readonly template: { readonly $children: unknown[] } }];
  revision: string;
}

interface TooltipNode {
  content: string;
  label: string;
  placement: string;
}

interface UpdateResult {
  readonly diagnostics: readonly { readonly code: string }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

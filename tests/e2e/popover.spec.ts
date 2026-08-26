import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

test("opens interactive JSON content and restores focus without losing identity", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const host = page.getByTestId("account-summary-popover");
  const trigger = host.getByRole("button", { name: "Review account summary" });
  const panel = host.getByRole("dialog", { name: "Current account summary" });
  await rememberIdentity(host);

  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(panel).toBeFocused();
  await expect(
    host.getByText("The selected account is active and ready for review.")
  ).toBeVisible();
  await expect(host.getByRole("link", { name: "Open account documentation" })).toHaveAttribute(
    "href",
    "#account-popover-details"
  );
  await panel.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await assertActivation(unifold);
  await unifold.assertAccessibility();
  await assertRejectionRecovery(page, host);
});

async function assertActivation(unifold: import("@unislang/unifold-playwright").UnifoldHarness) {
  const activation = (await unifold.events()).find(
    (event) =>
      event.type === ElementEventType.ComponentActivated &&
      event.data.sourceNode?.id === compositionNodeIds.accountSummaryPopover
  );
  expect(activation?.data.change).toEqual({ open: true });
}

async function assertRejectionRecovery(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await updatePopover(page, true);
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(rejected.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "invalid-property" })])
  );
  expect(await retainedIdentity(host)).toBe(true);
  expect((await updatePopover(page, false)).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(host.getByRole("button", { name: "Updated account summary" })).toHaveCount(1);
  await host.getByRole("button", { name: "Updated account summary" }).click();
  await expect(host.getByRole("dialog", { name: "Updated account panel" })).toBeVisible();
  expect(await retainedIdentity(host)).toBe(true);
}

function updatePopover(page: import("@playwright/test").Page, invalid: boolean) {
  return page.evaluate((reject) => {
    const target = window as unknown as PopoverWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument) as PopoverDocument;
    source.revision = ["popover-recovered", "popover-invalid"][Number(reject)] as string;
    const popover = source.compositions[0].template.$children.find(
      (node) => node.id === "account-summary-popover"
    );
    if (popover === undefined) throw new Error("Reference Popover is missing.");
    popover.label = "Updated account summary";
    popover.panelLabel = "Updated account panel";
    popover.placement = ["end", "center"][Number(reject)] as string;
    return target.__unifoldUpdateDocument(source);
  }, invalid);
}

async function rememberIdentity(host: import("@playwright/test").Locator): Promise<void> {
  await host.evaluate((element) => {
    (window as unknown as PopoverWindow).__unifoldStablePopover = element;
  });
}

async function retainedIdentity(host: import("@playwright/test").Locator): Promise<boolean> {
  return host.evaluate(
    (element) => (window as unknown as PopoverWindow).__unifoldStablePopover === element
  );
}

interface PopoverWindow {
  readonly __unifoldAuthoredDocument: PopoverDocument;
  readonly __unifoldUpdateDocument: (source: PopoverDocument) => UpdateResult;
  __unifoldStablePopover?: Element;
}

interface PopoverDocument {
  readonly compositions: readonly [{ readonly template: { readonly $children: PopoverNode[] } }];
  revision: string;
}

interface PopoverNode {
  id: string;
  label: string;
  panelLabel: string;
  placement: string;
}

interface UpdateResult {
  readonly diagnostics: readonly { readonly code: string }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

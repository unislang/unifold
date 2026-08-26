import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

test("opens modal JSON content, contains focus, and recovers without losing identity", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const host = page.getByTestId("account-review-dialog");
  const trigger = host.getByRole("button", { name: "Review account change", exact: true });
  const dialog = host.getByRole("dialog", { name: "Review account change" });
  const dismiss = host.getByRole("button", { name: "Cancel review" });
  await rememberIdentity(host);

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("open", "");
  await expect(dismiss).toBeFocused();
  await expect(
    host.getByText("Confirm the selected account details before continuing.")
  ).toBeVisible();
  await expect(host.getByRole("link", { name: "Inspect account documentation" })).toHaveAttribute(
    "href",
    "#account-dialog-details"
  );
  await dismiss.press("Tab");
  await expect(host.getByRole("link", { name: "Inspect account documentation" })).toBeFocused();
  await dialog.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await assertActivationSequence(unifold);
  await unifold.assertAccessibility();
  await assertRejectionRecovery(page, host);
});

async function assertActivationSequence(
  unifold: import("@unislang/unifold-playwright").UnifoldHarness
): Promise<void> {
  const changes = (await unifold.events())
    .filter(
      (event) =>
        event.type === ElementEventType.ComponentActivated &&
        event.data.sourceNode?.id === compositionNodeIds.accountReviewDialog
    )
    .map((event) => event.data.change);
  expect(changes).toEqual([
    { open: true, reason: "trigger" },
    { open: false, reason: "escape" }
  ]);
}

async function assertRejectionRecovery(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await updateDialog(page, true);
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(rejected.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "invalid-property" })])
  );
  expect(await retainedIdentity(host)).toBe(true);
  expect((await updateDialog(page, false)).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  const trigger = host.getByRole("button", { name: "Updated account review" });
  await expect(trigger).toHaveCount(1);
  await trigger.click();
  await expect(host.getByRole("dialog", { name: "Updated review dialog" })).toBeVisible();
  expect(await retainedIdentity(host)).toBe(true);
}

function updateDialog(page: import("@playwright/test").Page, invalid: boolean) {
  return page.evaluate((reject) => {
    const target = window as unknown as DialogWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument) as DialogDocument;
    source.revision = ["dialog-recovered", "dialog-invalid"][Number(reject)] as string;
    const dialog = source.compositions[0].template.$children.find(
      (node) => node.id === "account-review-dialog"
    );
    if (dialog === undefined) throw new Error("Reference Dialog is missing.");
    dialog.label = "Updated account review";
    dialog.dialogLabel = ["Updated review dialog", 42][Number(reject)] as number | string;
    return target.__unifoldUpdateDocument(source);
  }, invalid);
}

async function rememberIdentity(host: import("@playwright/test").Locator): Promise<void> {
  await host.evaluate((element) => {
    (window as unknown as DialogWindow).__unifoldStableDialog = element;
  });
}

async function retainedIdentity(host: import("@playwright/test").Locator): Promise<boolean> {
  return host.evaluate(
    (element) => (window as unknown as DialogWindow).__unifoldStableDialog === element
  );
}

interface DialogWindow {
  readonly __unifoldAuthoredDocument: DialogDocument;
  readonly __unifoldUpdateDocument: (source: DialogDocument) => UpdateResult;
  __unifoldStableDialog?: Element;
}

interface DialogDocument {
  readonly compositions: readonly [{ readonly template: { readonly $children: DialogNode[] } }];
  revision: string;
}

interface DialogNode {
  id: string;
  dialogLabel: number | string;
  label: string;
}

interface UpdateResult {
  readonly diagnostics: readonly { readonly code: string }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

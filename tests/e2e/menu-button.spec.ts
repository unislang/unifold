import { ElementEventType } from "@unislang/unifold-elements";
import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("invokes a bounded menu action with restored trigger focus", async ({ page, unifold }) => {
  await page.goto("/");
  const host = page.getByTestId("account-actions");
  const trigger = host.getByRole("button", { name: "Account actions" });
  await rememberIdentity(host);

  await trigger.press("ArrowDown");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(host.getByRole("menu")).toHaveAccessibleName("Account actions");
  await expect(trigger).toHaveAttribute(
    "aria-controls",
    `${compositionNodeIds.accountActions}__menu`
  );
  await expect(host.getByRole("menuitem", { name: "Edit account" })).toBeFocused();
  await host.getByRole("menuitem", { name: "Edit account" }).press("ArrowDown");
  await expect(host.getByRole("menuitem", { name: "Archive account" })).toBeFocused();
  await host.getByRole("menuitem", { name: "Archive account" }).press("Enter");

  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  const activations = menuActivations(await unifold.events());
  expect(activations).toHaveLength(1);
  assertActivation(activations[0] as CapturedEvent);
  await unifold.assertAccessibility();
  await assertRejectionRecovery(page, host);
});

function assertActivation(event: CapturedEvent): void {
  expect(event).toMatchObject({
    type: ElementEventType.ComponentActivated,
    data: {
      change: { itemId: "archive" },
      snapshot: {
        properties: {
          disabled: false,
          label: "Account actions"
        }
      },
      sourceNode: {
        id: compositionNodeIds.accountActions,
        type: "MenuButton",
        version: "1.0.0"
      }
    }
  });
}

function menuActivations(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return events.filter(
    (candidate) =>
      candidate.type === ElementEventType.ComponentActivated &&
      candidate.data.sourceNode?.id === compositionNodeIds.accountActions
  );
}

async function assertRejectionRecovery(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await updateMenu(page, true);
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(rejected.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "duplicate-option-value" })])
  );
  expect(await retainedIdentity(host)).toBe(true);
  expect((await updateMenu(page, false)).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await host.getByRole("button", { name: "Account actions" }).press("ArrowDown");
  await expect(host.getByRole("menuitem", { name: "Updated edit account" })).toHaveCount(1);
  expect(await retainedIdentity(host)).toBe(true);
}

async function rememberIdentity(host: import("@playwright/test").Locator): Promise<void> {
  await host.evaluate((element) => {
    (window as unknown as MenuWindow).__unifoldStableMenuButton = element;
  });
}

async function retainedIdentity(host: import("@playwright/test").Locator): Promise<boolean> {
  return host.evaluate(
    (element) => (window as unknown as MenuWindow).__unifoldStableMenuButton === element
  );
}

function updateMenu(page: import("@playwright/test").Page, invalid: boolean) {
  return page.evaluate((duplicate) => {
    const target = window as unknown as MenuWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument) as MenuDocument;
    source.revision = ["menu-recovered", "menu-invalid"][Number(duplicate)] as string;
    const menu = source.compositions[0].template.$children[3] as MenuNode;
    const first = menu.items[0];
    const third = menu.items[2];
    if (first === undefined) throw new Error("First menu item is missing.");
    if (third === undefined) throw new Error("Third menu item is missing.");
    first.label = "Updated edit account";
    third.value = ["archive", first.value][Number(duplicate)] as string;
    return target.__unifoldUpdateDocument(source);
  }, invalid);
}

interface MenuWindow {
  readonly __unifoldAuthoredDocument: MenuDocument;
  readonly __unifoldUpdateDocument: (source: MenuDocument) => UpdateResult;
  __unifoldStableMenuButton?: Element;
}

interface MenuDocument {
  readonly compositions: readonly [{ readonly template: { readonly $children: unknown[] } }];
  revision: string;
}

interface MenuNode {
  readonly items: { label: string; value: string }[];
}

interface UpdateResult {
  readonly diagnostics: readonly { readonly code: string }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

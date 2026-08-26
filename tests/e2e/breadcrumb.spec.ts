import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

test("navigates a semantic Breadcrumb and recovers without losing identity", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const host = page.getByTestId("account-breadcrumb");
  const navigation = host.getByRole("navigation", { name: "Account breadcrumb" });
  await rememberIdentity(host);
  await expect(navigation.getByRole("listitem")).toHaveCount(3);
  await expect(navigation.locator('[aria-current="page"]')).toHaveText("Current account");
  await navigation.getByRole("link", { name: "Home" }).click();
  await assertActivation(unifold);
  await assertBreadcrumbJsonLd(page);
  await unifold.assertAccessibility();
  await assertRejectionRecovery(page, host);
});

async function assertActivation(unifold: import("@unislang/unifold-playwright").UnifoldHarness) {
  const activation = (await unifold.events()).find((event) => isBreadcrumbActivation(event));
  expect(activation?.data.change).toEqual({ href: "#account-home", itemId: "home" });
}

function isBreadcrumbActivation(event: {
  readonly data: { readonly sourceNode?: { readonly id: string } };
  readonly type: string;
}): boolean {
  return [
    event.type === ElementEventType.ComponentActivated,
    event.data.sourceNode?.id === compositionNodeIds.accountBreadcrumb
  ].every(Boolean);
}

async function assertBreadcrumbJsonLd(page: import("@playwright/test").Page): Promise<void> {
  const graph = await page.locator("script[data-unifold-semantics]").evaluate((element) => {
    return JSON.parse(element.textContent ?? "{}") as { readonly "@graph"?: unknown[] };
  });
  const entities = graph["@graph"] as readonly Record<string, unknown>[];
  const list = entities.find((entity) => entity["@type"] === "BreadcrumbList");
  const positions = entities
    .filter((entity) => entity["@type"] === "ListItem")
    .map((entity) => entity["position"])
    .sort();
  expect(list?.["numberOfItems"]).toBe(3);
  expect(positions).toEqual([1, 2, 3]);
}

async function assertRejectionRecovery(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await updateBreadcrumb(page, true);
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(rejected.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "duplicate-breadcrumb-item-id" })])
  );
  expect(await retainedIdentity(host)).toBe(true);
  expect((await updateBreadcrumb(page, false)).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(host.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "#dashboard");
  expect(await retainedIdentity(host)).toBe(true);
}

function updateBreadcrumb(page: import("@playwright/test").Page, invalid: boolean) {
  const update = {
    items: invalid ? duplicateItems() : recoveredItems(),
    revision: invalid ? "breadcrumb-invalid" : "breadcrumb-recovered"
  };
  return page.evaluate((input) => {
    const target = window as unknown as BreadcrumbWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument);
    source.revision = input.revision;
    const breadcrumb = source.compositions[0].template.$children.find(
      (node) => node.id === "account-breadcrumb"
    );
    if (breadcrumb === undefined) throw new Error("Reference Breadcrumb is missing.");
    breadcrumb.items = input.items;
    breadcrumb.separator = "slash";
    return target.__unifoldUpdateDocument(source);
  }, update);
}

function duplicateItems(): BreadcrumbItem[] {
  return [
    { href: "#home", id: "duplicate", label: "Home" },
    { id: "duplicate", label: "Current" }
  ];
}

function recoveredItems(): BreadcrumbItem[] {
  return [
    { href: "#dashboard", id: "dashboard", label: "Dashboard" },
    { id: "current", label: "Current account" }
  ];
}

async function rememberIdentity(host: import("@playwright/test").Locator): Promise<void> {
  await host.evaluate((element) => {
    (window as unknown as BreadcrumbWindow).__unifoldStableBreadcrumb = element;
  });
}

async function retainedIdentity(host: import("@playwright/test").Locator): Promise<boolean> {
  return host.evaluate(
    (element) => (window as unknown as BreadcrumbWindow).__unifoldStableBreadcrumb === element
  );
}

interface BreadcrumbWindow {
  readonly __unifoldAuthoredDocument: BreadcrumbDocument;
  readonly __unifoldUpdateDocument: (source: BreadcrumbDocument) => UpdateResult;
  __unifoldStableBreadcrumb?: Element;
}

interface BreadcrumbDocument {
  readonly compositions: readonly [{ readonly template: { readonly $children: BreadcrumbNode[] } }];
  revision: string;
}

interface BreadcrumbNode {
  readonly id: string;
  items?: BreadcrumbItem[];
  separator?: string;
}

interface BreadcrumbItem {
  readonly href?: string;
  readonly id: string;
  readonly label: string;
}

interface UpdateResult {
  readonly diagnostics: readonly { readonly code: string }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

import { expect, test, type Page } from "@playwright/test";

enum HostPage {
  Plain = "plain",
  React = "react",
  Svelte = "svelte",
  Vue = "vue"
}

const hostPages = Object.values(HostPage);

for (const hostPage of hostPages) {
  test(`${hostPage} preserves the canonical Unifold authority`, async ({ page }) => {
    await verifyHostParity(page, hostPage);
  });
}

async function verifyHostParity(page: Page, hostPage: HostPage): Promise<void> {
  const errors = captureBrowserErrors(page);
  await page.goto(`/${hostPage}.html`);
  await expect.poll(() => mountedFramework(page)).toBe(hostPage);
  await verifyDirectComponentContract(page);
  await verifyCanonicalAuthority(page);
  await unmountHost(page);
  await expect.poll(() => disposed(page)).toBe(true);
  await expect(page.locator("[data-unifold-node-id]")).toHaveCount(0);
  expect(errors).toEqual([]);
}

async function verifyDirectComponentContract(page: Page): Promise<void> {
  await expect(page.getByTestId("slotted-content")).toBeVisible();
  await expect(page.getByLabel("Framework probe")).toHaveValue("Host value");
  await page.getByLabel("Framework probe").fill("Framework value");
  await expect.poll(() => probeEventCount(page)).toBe(1);
  expect(await probeContract(page)).toEqual({
    eventNodeId: "framework-probe",
    eventType: "org.unifold.ui.control.input.v1",
    value: "Framework value"
  });
}

async function verifyCanonicalAuthority(page: Page): Promise<void> {
  await clearEvents(page);
  const field = page.getByLabel("Name");
  await field.fill("Grace Hopper");
  await field.focus();
  await rememberFieldHost(page);
  await expect.poll(() => eventCount(page)).toBe(3);
  expect(await eventTimeline(page)).toEqual(expectedTimeline);
  expect(await runtimeValue(page)).toBe("Grace Hopper");
  await rerenderShell(page);
  await expect(page.locator("#shell")).toHaveAttribute("data-shell-render-count", "2");
  expect(await fieldHostRetained(page)).toBe(true);
  await expect(field).toBeFocused();
  expect(await runtimeValue(page)).toBe("Grace Hopper");
  expect(await eventCount(page)).toBe(3);
  expect(await mountCount(page)).toBe(1);
}

const expectedTimeline = {
  revisions: [0, 1, 1],
  sequences: [1, 2, 3],
  types: [
    "org.unifold.ui.control.input.v1",
    "org.unifold.ui.command.applied.v1",
    "org.unifold.ui.transaction.committed.v1"
  ]
};

function captureBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function mountedFramework(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__unifoldHostEvidence?.framework);
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldHostEvidence?.events.splice(0));
}

async function eventCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__unifoldHostEvidence?.events.length ?? 0);
}

async function probeEventCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__unifoldHostEvidence?.probeEvents.length ?? 0);
}

async function probeContract(page: Page) {
  return page.evaluate(() => {
    const probe = document.querySelector("#framework-probe") as ProbeElement;
    const evidence = window.__unifoldHostEvidence as NonNullable<Window["__unifoldHostEvidence"]>;
    const event = evidence.probeEvents[0] as (typeof evidence.probeEvents)[number];
    return {
      eventNodeId: probe.eventNode.id,
      eventType: event.type,
      value: probe.value
    };
  });
}

async function eventTimeline(page: Page) {
  return page.evaluate(() => {
    const events = window.__unifoldHostEvidence?.events ?? [];
    return {
      revisions: events.map((event) => event.staterevision),
      sequences: events.map((event) => event.sequence),
      types: events.map((event) => event.type)
    };
  });
}

async function runtimeValue(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    return window.__unifoldHostEvidence?.application.runtime.getSnapshot("name").control?.value;
  });
}

async function rememberFieldHost(page: Page): Promise<void> {
  await page.locator('[data-unifold-node-id="name"]').evaluate((element) => {
    window.__unifoldRetainedHost = element;
  });
}

async function rerenderShell(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Rerender shell" }).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

async function fieldHostRetained(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return window.__unifoldRetainedHost === document.querySelector('[data-unifold-node-id="name"]');
  });
}

async function mountCount(page: Page): Promise<number | undefined> {
  return page.evaluate(() => window.__unifoldHostEvidence?.mountCount);
}

async function unmountHost(page: Page): Promise<void> {
  await page.evaluate(async () => window.__unifoldUnmountHost?.());
}

async function disposed(page: Page): Promise<boolean | undefined> {
  return page.evaluate(() => window.__unifoldHostEvidence?.disposed);
}

declare global {
  interface Window {
    __unifoldRetainedHost?: Element;
  }
}

interface ProbeElement extends Element {
  readonly eventNode: { readonly id: string };
  readonly value: string;
}

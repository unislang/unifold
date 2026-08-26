import type { Page } from "@playwright/test";
import { expect, it, vi } from "vitest";

import { installSettledNavigation } from "./settled-navigation.js";

it("waits for startup imports to settle before navigation resolves", async () => {
  const goto = vi.fn(async () => null);
  const getAttribute = vi.fn(async () => null);
  const page = {
    goto,
    locator: vi.fn(() => ({ getAttribute })),
    waitForFunction: vi.fn()
  } as unknown as Page;
  installSettledNavigation(page);

  await page.goto("/", { timeout: 1_000, waitUntil: "load" });

  expect(goto).toHaveBeenCalledWith("/", { timeout: 1_000, waitUntil: "networkidle" });
});

it("waits for an explicitly pending Unifold application readiness marker", async () => {
  const goto = vi.fn(async () => null);
  const getAttribute = vi.fn().mockResolvedValueOnce("pending").mockResolvedValueOnce("ready");
  const waitForFunction = vi.fn(async (predicate: () => boolean) => predicate);
  const page = {
    goto,
    locator: vi.fn(() => ({ getAttribute })),
    waitForFunction
  } as unknown as Page;
  installSettledNavigation(page);

  await page.goto("/");

  expect(waitForFunction).toHaveBeenCalledOnce();
});

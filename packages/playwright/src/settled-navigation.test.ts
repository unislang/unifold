import type { Page } from "@playwright/test";
import { expect, it, vi } from "vitest";

import { installSettledNavigation } from "./settled-navigation.js";

it("waits for startup imports to settle before navigation resolves", async () => {
  const goto = vi.fn(async () => null);
  const page = { goto } as unknown as Page;
  installSettledNavigation(page);

  await page.goto("/", { timeout: 1_000, waitUntil: "load" });

  expect(goto).toHaveBeenCalledWith("/", { timeout: 1_000, waitUntil: "networkidle" });
});

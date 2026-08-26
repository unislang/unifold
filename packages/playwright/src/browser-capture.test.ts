// @vitest-environment happy-dom
import type { Page } from "@playwright/test";
import { expect, it, vi } from "vitest";

import {
  installEventCapture,
  readCapturedEvents,
  readRenderBaseline,
  readRenderUpdates
} from "./browser-capture.js";

it("captures public Unifold events from page initialization", verifyEventCapture);
it("measures render baselines and selective update deltas", verifyRenderCapture);

async function verifyEventCapture(): Promise<void> {
  const page = browserPage();
  await installEventCapture(page);
  const detail = { id: "event-1" };
  window.dispatchEvent(new CustomEvent("unifold-event", { detail }));
  await expect(readCapturedEvents(page)).resolves.toEqual([detail]);
  expect(page.addInitScript).toHaveBeenCalledTimes(1);
}

async function verifyRenderCapture(): Promise<void> {
  const page = browserPage();
  const field = renderHost("field", 2, true);
  const baseline = await readRenderBaseline(page, ["field", "missing"]);
  expect(baseline).toEqual({ field: 2, missing: 0 });
  field.setAttribute("data-unifold-render-count", "5");
  await expect(readRenderUpdates(page, baseline)).resolves.toEqual([
    { nodeId: "field", updateCount: 3 },
    { nodeId: "missing", updateCount: 0 }
  ]);
}

function browserPage(): Page {
  return {
    addInitScript: vi.fn(async (script: () => void) => script()),
    evaluate: vi.fn(async (script: (value?: unknown) => unknown, value?: unknown) => script(value))
  } as unknown as Page;
}

function renderHost(id: string, count: number, nested = false): HTMLElement {
  const host = document.createElement("div");
  host.dataset["unifoldNodeId"] = id;
  host.dataset["unifoldRenderCount"] = String(count);
  if (nested) {
    const parent = document.createElement("section");
    parent.attachShadow({ mode: "open" }).append(host);
    document.body.append(parent);
  } else document.body.append(host);
  return host;
}

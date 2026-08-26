import type { Page } from "@playwright/test";
import type { UiEvent } from "@unislang/unifold-events";
import type { SelectiveUpdateObservation } from "@unislang/unifold-testkit";

interface BrowserTestWindow extends Window {
  __unifoldCapturedEvents: UiEvent[];
}

export type RenderBaseline = Readonly<Record<string, number>>;

export async function installEventCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as BrowserTestWindow;
    target.__unifoldCapturedEvents = [];
    window.addEventListener("unifold-event", (event) => {
      const detail = (event as CustomEvent<UiEvent>).detail;
      const captured = target.__unifoldCapturedEvents;
      if (!captured.some((item) => item.id === detail.id)) captured.push(detail);
    });
  });
}

export async function readCapturedEvents(page: Page): Promise<readonly UiEvent[]> {
  return page.evaluate(() => {
    const target = window as unknown as BrowserTestWindow;
    return target.__unifoldCapturedEvents ?? [];
  });
}

export async function readRenderBaseline(
  page: Page,
  nodeIds: readonly string[]
): Promise<RenderBaseline> {
  return page.evaluate(
    (ids) =>
      Object.fromEntries(
        ids.map((id) => {
          const host = document.querySelector(`[data-unifold-node-id="${CSS.escape(id)}"]`);
          return [id, Number(host?.getAttribute("data-unifold-render-count") ?? 0)];
        })
      ),
    nodeIds
  );
}

export async function readRenderUpdates(
  page: Page,
  baseline: RenderBaseline
): Promise<readonly SelectiveUpdateObservation[]> {
  return page.evaluate(
    (before) =>
      Object.entries(before).map(([nodeId, count]) => {
        const host = document.querySelector(`[data-unifold-node-id="${CSS.escape(nodeId)}"]`);
        const current = Number(host?.getAttribute("data-unifold-render-count") ?? 0);
        return { nodeId, updateCount: current - count };
      }),
    baseline
  );
}

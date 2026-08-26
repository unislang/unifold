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
  return page.evaluate(renderCounts, nodeIds);
}

export async function readRenderUpdates(
  page: Page,
  baseline: RenderBaseline
): Promise<readonly SelectiveUpdateObservation[]> {
  const current = await page.evaluate(renderCounts, Object.keys(baseline));
  return Object.entries(baseline).map(([nodeId, count]) => ({
    nodeId,
    updateCount: (current[nodeId] ?? 0) - count
  }));
}

function renderCounts(nodeIds: readonly string[]): Record<string, number> {
  return Object.fromEntries(
    nodeIds.map((id) => {
      const host = findRenderedHost(document, id);
      return [id, Number(host?.getAttribute("data-unifold-render-count") ?? 0)];
    })
  );

  function findRenderedHost(root: Document | ShadowRoot, nodeId: string): Element | null {
    const selector = `[data-unifold-node-id="${CSS.escape(nodeId)}"]`;
    return root.querySelector(selector) ?? findNestedRenderedHost(root, nodeId);
  }

  function findNestedRenderedHost(root: Document | ShadowRoot, nodeId: string): Element | null {
    for (const element of root.querySelectorAll("*")) {
      const nested = findRenderedHostInShadow(element, nodeId);
      if (nested !== null) return nested;
    }
    return null;
  }

  function findRenderedHostInShadow(element: Element, nodeId: string): Element | null {
    const shadow = element.shadowRoot;
    return shadow === null ? null : findRenderedHost(shadow, nodeId);
  }
}

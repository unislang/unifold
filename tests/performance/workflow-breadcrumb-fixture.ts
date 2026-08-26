import { CoreComponentType, type JsonObject } from "@unislang/unifold-contracts";
import type { UnifoldBreadcrumb } from "@unislang/unifold-elements";
import { defineUnifoldBreadcrumb } from "@unislang/unifold-elements/breadcrumb";
import type { UiEvent } from "@unislang/unifold-events";

const BREADCRUMB_ITEM_COUNT = 32;
const TARGET_INDEX = BREADCRUMB_ITEM_COUNT - 2;

export function defineWorkflowBreadcrumb(): void {
  defineUnifoldBreadcrumb(customElements);
}

export function workflowBreadcrumbNode(): JsonObject {
  return {
    $comp: CoreComponentType.Breadcrumb,
    id: "workflow-breadcrumb",
    items: Array.from({ length: BREADCRUMB_ITEM_COUNT }, (_, index) => breadcrumbItem(index)),
    label: "Workflow breadcrumb"
  };
}

export async function measureBreadcrumbActivation(breadcrumb: UnifoldBreadcrumb) {
  let itemId = "";
  const capture = (event: Event) => {
    itemId = eventItemId((event as CustomEvent<UiEvent>).detail) ?? itemId;
  };
  breadcrumb.addEventListener("unifold-event", capture);
  const started = performance.now();
  link(breadcrumb, TARGET_INDEX).click();
  await breadcrumb.updateComplete;
  const milliseconds = performance.now() - started;
  breadcrumb.removeEventListener("unifold-event", capture);
  return { itemId, milliseconds, renderedItems: renderedItemCount(breadcrumb) };
}

function breadcrumbItem(index: number): JsonObject {
  const item = {
    id: `breadcrumb-${String(index).padStart(2, "0")}`,
    label: `Breadcrumb ${index}`
  };
  return index === BREADCRUMB_ITEM_COUNT - 1 ? item : { ...item, href: `#workflow-${index}` };
}

function eventItemId(event: UiEvent): string | undefined {
  const change = event.data.change;
  if (!isRecord(change)) return undefined;
  const value = Reflect.get(change, "itemId");
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is object {
  return [value !== null, typeof value === "object", !Array.isArray(value)].every(Boolean);
}

function link(breadcrumb: UnifoldBreadcrumb, index: number): HTMLAnchorElement {
  const candidate = breadcrumb.shadowRoot?.querySelector(`[data-breadcrumb-index="${index}"]`);
  if (!(candidate instanceof HTMLAnchorElement)) throw new Error("Breadcrumb target is missing.");
  return candidate;
}

function renderedItemCount(breadcrumb: UnifoldBreadcrumb): number {
  return breadcrumb.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0;
}

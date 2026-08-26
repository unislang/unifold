import type { JsonObject } from "@unislang/unifold-contracts";
import type { UnifoldMenuButton } from "@unislang/unifold-elements";
import type { UiEvent } from "@unislang/unifold-events";

interface MenuInteractionEvidence {
  readonly itemId: string;
  readonly milliseconds: number;
  readonly renderedButtons: number;
  readonly triggerFocused: boolean;
}

export function workflowMenuNode(count: number): JsonObject {
  return {
    $comp: "MenuButton",
    id: "workflow-menu",
    items: Array.from({ length: count }, (_, index) => ({
      label: `Action ${index}`,
      value: `item-${String(index).padStart(3, "0")}`
    })),
    label: "Workflow actions"
  };
}

export async function measureMenuActivation(
  menu: UnifoldMenuButton,
  index: number
): Promise<MenuInteractionEvidence> {
  let itemId = "";
  const capture = (event: Event) => {
    const value = itemIdFromEvent((event as CustomEvent<UiEvent>).detail);
    if (value !== undefined) itemId = value;
  };
  menu.addEventListener("unifold-event", capture);
  const started = performance.now();
  trigger(menu).dispatchEvent(key("ArrowUp"));
  await menu.updateComplete;
  item(menu, index).click();
  await menu.updateComplete;
  const milliseconds = performance.now() - started;
  menu.removeEventListener("unifold-event", capture);
  return {
    itemId,
    milliseconds,
    renderedButtons: renderedButtonCount(menu),
    triggerFocused: menuActiveElement(menu) === trigger(menu)
  };
}

function itemIdFromEvent(event: UiEvent): string | undefined {
  const change = event.data.change;
  if (!isRecord(change)) return undefined;
  const value = Reflect.get(change, "itemId");
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is object {
  return [value !== null, typeof value === "object", !Array.isArray(value)].every(Boolean);
}

function renderedButtonCount(menu: UnifoldMenuButton): number {
  return menu.shadowRoot?.querySelectorAll("button").length ?? 0;
}

function menuActiveElement(menu: UnifoldMenuButton): Element | null | undefined {
  return menu.shadowRoot?.activeElement;
}

function trigger(menu: UnifoldMenuButton): HTMLButtonElement {
  return requireButton(menu, "[part=trigger]");
}

function item(menu: UnifoldMenuButton, index: number): HTMLButtonElement {
  return requireButton(menu, `[data-menu-index="${index}"]`);
}

function requireButton(menu: UnifoldMenuButton, selector: string): HTMLButtonElement {
  const candidate = menu.shadowRoot?.querySelector(selector);
  if (!(candidate instanceof HTMLButtonElement)) throw new Error(`${selector} is missing.`);
  return candidate;
}

function key(value: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, key: value });
}

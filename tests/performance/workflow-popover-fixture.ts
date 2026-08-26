import { CoreComponentType, type JsonObject } from "@unislang/unifold-contracts";
import type { UnifoldPopover } from "@unislang/unifold-elements";
import { defineUnifoldPopover } from "@unislang/unifold-elements/popover";

const POPOVER_ACTION_COUNT = 32;

export function defineWorkflowPopover(): void {
  defineUnifoldPopover(customElements);
}

export function workflowPopoverNode(): JsonObject {
  return {
    $comp: CoreComponentType.Popover,
    $children: Array.from({ length: POPOVER_ACTION_COUNT }, (_, index) => ({
      $comp: CoreComponentType.Button,
      id: `popover-action-${String(index).padStart(2, "0")}`,
      label: `Popover action ${index}`
    })),
    id: "workflow-popover",
    label: "Open workflow actions",
    panelLabel: "Workflow actions",
    placement: "bottom"
  };
}

export async function measurePopoverOpening(popover: UnifoldPopover) {
  const trigger = requireTrigger(popover);
  const started = performance.now();
  trigger.click();
  await popover.updateComplete;
  return {
    focused: popover.shadowRoot?.activeElement?.getAttribute("part") === "surface",
    milliseconds: performance.now() - started
  };
}

function requireTrigger(popover: UnifoldPopover): HTMLButtonElement {
  const root = popover.shadowRoot;
  if (root === null) throw new Error("Popover shadow root is missing.");
  const trigger = root.querySelector<HTMLButtonElement>("[part=trigger]");
  if (trigger === null) throw new Error("Popover trigger is missing.");
  return trigger;
}

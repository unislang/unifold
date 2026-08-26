import { CoreComponentType, type JsonObject } from "@unislang/unifold-contracts";
import type { UnifoldDialog } from "@unislang/unifold-elements";
import { defineUnifoldDialog } from "@unislang/unifold-elements/dialog";

const DIALOG_ACTION_COUNT = 32;

export function defineWorkflowDialog(): void {
  defineUnifoldDialog(customElements);
}

export function workflowDialogNode(): JsonObject {
  return {
    $comp: CoreComponentType.Dialog,
    $children: Array.from({ length: DIALOG_ACTION_COUNT }, (_, index) => ({
      $comp: CoreComponentType.Button,
      id: `dialog-action-${String(index).padStart(2, "0")}`,
      label: `Dialog action ${index}`
    })),
    dialogLabel: "Workflow confirmation actions",
    dismissLabel: "Cancel workflow confirmation",
    id: "workflow-dialog",
    label: "Review workflow confirmation"
  };
}

export async function measureDialogOpening(dialog: UnifoldDialog) {
  const started = performance.now();
  requireTrigger(dialog).click();
  await dialog.updateComplete;
  const evidence = {
    focused: dialog.shadowRoot?.activeElement?.getAttribute("part") === "dismiss",
    milliseconds: performance.now() - started,
    open: dialog.open
  };
  requireDismiss(dialog).click();
  await dialog.updateComplete;
  return evidence;
}

function requireDismiss(dialog: UnifoldDialog): HTMLButtonElement {
  const root = dialog.shadowRoot;
  if (root === null) throw new Error("Dialog shadow root is missing.");
  const dismiss = root.querySelector<HTMLButtonElement>("[part=dismiss]");
  if (dismiss === null) throw new Error("Dialog dismiss button is missing.");
  return dismiss;
}

function requireTrigger(dialog: UnifoldDialog): HTMLButtonElement {
  const root = dialog.shadowRoot;
  if (root === null) throw new Error("Dialog shadow root is missing.");
  const trigger = root.querySelector<HTMLButtonElement>("[part=trigger]");
  if (trigger === null) throw new Error("Dialog trigger is missing.");
  return trigger;
}

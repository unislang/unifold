import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceDialogNode(): JsonObject {
  return {
    $comp: "Dialog",
    $children: [{ $comp: "Text", content: "Confirm the account change.", id: "dialog-copy" }],
    dialogLabel: "Confirm account change",
    dismissLabel: "Cancel change",
    id: "account-review-dialog",
    label: "Review account change"
  };
}

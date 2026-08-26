import { defineUnifoldDialog } from "@unislang/unifold/dialog";

import accountReviewDialog from "./account-review-dialog.json" with { type: "json" };

interface ReferenceDocument {
  readonly compositions: { readonly template: { readonly $children: unknown[] } }[];
}

export function installReferenceDialog(document: ReferenceDocument) {
  appendReferenceDialog(document);
  return defineUnifoldDialog();
}

function appendReferenceDialog(document: ReferenceDocument): void {
  const composition = document.compositions[0];
  if (composition === undefined) throw new Error("The reference ProfileEditor is missing.");
  composition.template.$children.push(accountReviewDialog);
}

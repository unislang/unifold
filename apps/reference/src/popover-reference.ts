import { defineUnifoldPopover } from "@unislang/unifold/popover";

import accountSummaryPopover from "./account-summary-popover.json" with { type: "json" };

interface ReferenceDocument {
  readonly compositions: { readonly template: { readonly $children: unknown[] } }[];
}

export { defineUnifoldPopover };

export function appendReferencePopover(document: ReferenceDocument): void {
  const composition = document.compositions[0];
  if (composition === undefined) throw new Error("The reference ProfileEditor is missing.");
  composition.template.$children.push(accountSummaryPopover);
}

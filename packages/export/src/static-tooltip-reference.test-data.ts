import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceTooltipNode(): JsonObject {
  return {
    $comp: "Tooltip",
    content: "Account actions apply to the current profile.",
    id: "account-actions-help",
    label: "About account actions",
    placement: "bottom"
  };
}

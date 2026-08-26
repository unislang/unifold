import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceMenuButton(): JsonObject {
  return {
    $comp: "MenuButton",
    id: "account-menu",
    items: [
      { label: "Edit account", value: "edit" },
      { disabled: true, label: "Delete account", value: "delete" }
    ],
    label: "Account actions"
  };
}

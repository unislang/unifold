import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceBreadcrumbNode(): JsonObject {
  return {
    $comp: "Breadcrumb",
    id: "account-breadcrumb",
    items: [
      { href: "#home", id: "home", label: "Home" },
      { id: "account", label: "Account" }
    ],
    label: "Account breadcrumb"
  };
}

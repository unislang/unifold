import { defineUnifoldBreadcrumb } from "@unislang/unifold/breadcrumb";

import breadcrumb from "./account-breadcrumb.json" with { type: "json" };
import breadcrumbEntities from "./account-breadcrumb-semantics.json" with { type: "json" };

interface ReferenceDocument {
  readonly compositions: { readonly template: { readonly $children: unknown[] } }[];
  readonly semantics: { readonly entities: unknown[] };
}

function appendReferenceBreadcrumb(document: ReferenceDocument): void {
  const composition = document.compositions[0];
  if (composition === undefined) throw new Error("The reference ProfileEditor is missing.");
  composition.template.$children.push(breadcrumb);
  document.semantics.entities.push(...breadcrumbEntities);
}

export function installReferenceBreadcrumb(document: ReferenceDocument) {
  const registration = defineUnifoldBreadcrumb();
  appendReferenceBreadcrumb(document);
  return registration;
}

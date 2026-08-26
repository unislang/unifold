interface InteractiveReferenceFamilies {
  readonly breadcrumb: typeof import("./breadcrumb-reference.js");
  readonly dialog: typeof import("./dialog-reference.js");
  readonly menuButton: typeof import("@unislang/unifold/menu-button");
  readonly popover: typeof import("./popover-reference.js");
  readonly tooltip: typeof import("@unislang/unifold/tooltip");
}

interface ReferenceDocument {
  readonly compositions: { readonly template: { readonly $children: unknown[] } }[];
  readonly semantics: { readonly entities: unknown[] };
}

type RegistrationResult = ReturnType<
  typeof import("@unislang/unifold/tooltip").defineUnifoldTooltip
>;

export function registerReferenceInteractiveFamilies(
  families: InteractiveReferenceFamilies,
  document: ReferenceDocument
): void {
  assertRegistered("Breadcrumb", families.breadcrumb.defineUnifoldBreadcrumb());
  families.breadcrumb.appendReferenceBreadcrumb(document);
  assertRegistered("Dialog", families.dialog.installReferenceDialog(document));
  assertRegistered("MenuButton", families.menuButton.defineUnifoldMenuButton());
  assertRegistered("Popover", families.popover.defineUnifoldPopover());
  families.popover.appendReferencePopover(document);
  assertRegistered("Tooltip", families.tooltip.defineUnifoldTooltip());
}

function assertRegistered(name: string, result: RegistrationResult): void {
  if (result.status !== "registered")
    throw new Error(`${name} family registration failed: ${JSON.stringify(result.diagnostics)}`);
}

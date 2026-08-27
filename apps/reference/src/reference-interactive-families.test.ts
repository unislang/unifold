import { expect, it, vi } from "vitest";

import { registerReferenceInteractiveFamilies } from "./reference-interactive-families.js";

it("registers every interactive family through its owning operation", () => {
  const families = familySpies();
  const document = { compositions: [], semantics: { entities: [] } };
  registerReferenceInteractiveFamilies(families as never, document);
  expect(families.breadcrumb.installReferenceBreadcrumb).toHaveBeenCalledWith(document);
  expect(families.dialog.installReferenceDialog).toHaveBeenCalledWith(document);
  expect(families.menuButton.defineUnifoldMenuButton).toHaveBeenCalledOnce();
  expect(families.popover.installReferencePopover).toHaveBeenCalledWith(document);
  expect(families.tooltip.defineUnifoldTooltip).toHaveBeenCalledOnce();
});

it("fails when an owning family registration is rejected", () => {
  const families = familySpies();
  families.tooltip.defineUnifoldTooltip.mockReturnValue({
    diagnostics: [{ message: "incompatible" }],
    status: "rejected"
  } as never);
  expect(() =>
    registerReferenceInteractiveFamilies(families as never, {
      compositions: [],
      semantics: { entities: [] }
    })
  ).toThrow("Tooltip family registration failed");
});

function familySpies() {
  const success = () => ({ diagnostics: [], status: "registered" as const });
  return {
    breadcrumb: { installReferenceBreadcrumb: vi.fn(success) },
    dialog: { installReferenceDialog: vi.fn(success) },
    menuButton: { defineUnifoldMenuButton: vi.fn(success) },
    popover: { installReferencePopover: vi.fn(success) },
    tooltip: { defineUnifoldTooltip: vi.fn(success) }
  };
}

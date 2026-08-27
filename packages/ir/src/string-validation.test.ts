import { CatalogPropertyType, type CatalogPropertyDescriptor } from "@unislang/unifold-catalog";
import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { isCatalogString } from "./string-validation.js";
import { validateNodeProperties } from "./property-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const descriptor: CatalogPropertyDescriptor = {
  maximumLength: 4,
  minimumLength: 1,
  name: "message",
  required: true,
  valueType: CatalogPropertyType.String
};

it("accepts bounded non-whitespace catalog strings", () => {
  expect(isCatalogString("news", descriptor)).toBe(true);
  expect(isCatalogString(" n ", descriptor)).toBe(true);
});

it("rejects non-strings, whitespace-only text, and overlong text", () => {
  expect(isCatalogString(1, descriptor)).toBe(false);
  expect(isCatalogString("   ", descriptor)).toBe(false);
  expect(isCatalogString("alert", descriptor)).toBe(false);
});

it("rejects blank and overlong Toast live content", () => {
  expect(toastDiagnostics({ label: "   ", message: "x".repeat(4_097) })).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "invalid-property", path: "/view/label" }),
      expect.objectContaining({ code: "invalid-property", path: "/view/message" })
    ])
  );
});

it("requires the Toast visible title", () => {
  expect(toastDiagnostics({ message: "Available" })).toContainEqual(
    expect.objectContaining({ code: "missing-required-property", path: "/view/label" })
  );
});

it("accepts hidden Toast state and rejects non-boolean visibility", () => {
  expect(toastDiagnostics({ label: "Saved", message: "Profile saved", visible: false })).toEqual(
    []
  );
  expect(
    toastDiagnostics({ label: "Saved", message: "Profile saved", visible: "false" })
  ).toContainEqual(expect.objectContaining({ code: "invalid-property", path: "/view/visible" }));
});

function toastDiagnostics(properties: Readonly<Record<string, unknown>>) {
  const diagnostics: CompilerDiagnostic[] = [];
  validateNodeProperties(
    { $comp: CoreComponentType.Toast, id: "notice", ...properties },
    CoreComponentType.Toast,
    "/view",
    diagnostics
  );
  return diagnostics;
}

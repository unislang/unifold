import { CatalogConstraintKind, getCoreDescriptor } from "@unislang/unifold-catalog";
import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { validateComponentConstraints } from "./component-constraints.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

it("accepts declared scalar, array, and empty selections", () => {
  expect(validateChoice(CoreComponentType.Select, "ca")).toEqual([]);
  expect(validateChoice(CoreComponentType.Combobox, "ca")).toEqual([]);
  expect(validateChoice(CoreComponentType.MultiSelect, ["us", "ca"])).toEqual([]);
  expect(validateChoice(CoreComponentType.RadioGroup, "us")).toEqual([]);
  expect(validateChoice(CoreComponentType.Select, "")).toEqual([]);
});

it("reports every duplicate option after its first declaration", () => {
  const diagnostics = validateChoice(CoreComponentType.Select, "us", [
    { label: "US", value: "us" },
    { label: "United States", value: "us" },
    { label: "USA", value: "us" }
  ]);

  expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
    { code: DiagnosticCode.DuplicateOptionValue, path: "/view/options/1/value" },
    { code: DiagnosticCode.DuplicateOptionValue, path: "/view/options/2/value" }
  ]);
});

it("reports each selection that is absent from the option values", () => {
  const diagnostics = validateChoice(CoreComponentType.MultiSelect, ["missing", "ca", "other"]);

  expect(diagnostics.map(({ code, nodeId, path }) => ({ code, nodeId, path }))).toEqual([
    { code: DiagnosticCode.UnknownOptionSelection, nodeId: "choice", path: "/view/value/0" },
    { code: DiagnosticCode.UnknownOptionSelection, nodeId: "choice", path: "/view/value/2" }
  ]);
});

it("defers malformed values to property validation", () => {
  expect(validateChoice(CoreComponentType.Select, 42, "invalid")).toEqual([]);
});

it("rejects children for an exact leaf component", () => {
  const descriptor = getCoreDescriptor(CoreComponentType.Tooltip);
  if (descriptor === undefined) throw new Error("Missing Tooltip descriptor.");
  const diagnostics: CompilerDiagnostic[] = [];
  validateComponentConstraints(
    {
      $children: [{ $comp: CoreComponentType.Text, content: "Hidden", id: "hidden" }],
      $comp: CoreComponentType.Tooltip,
      content: "Help",
      id: "help",
      label: "More information"
    },
    descriptor,
    "/view",
    diagnostics
  );

  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: DiagnosticCode.InvalidChildCount,
      nodeId: "help",
      path: "/view/$children"
    })
  ]);
});

it("has a validator for every enum-backed constraint kind", () => {
  expect(Object.values(CatalogConstraintKind)).toHaveLength(10);
});

function validateChoice(
  type:
    | CoreComponentType.Combobox
    | CoreComponentType.Select
    | CoreComponentType.MultiSelect
    | CoreComponentType.RadioGroup,
  value: unknown,
  options: unknown = validOptions()
): CompilerDiagnostic[] {
  const descriptor = getCoreDescriptor(type);
  if (descriptor === undefined) throw new Error(`Missing ${type} descriptor.`);
  const diagnostics: CompilerDiagnostic[] = [];
  validateComponentConstraints(
    { $comp: type, id: "choice", options, value },
    descriptor,
    "/view",
    diagnostics
  );
  return diagnostics;
}

function validOptions() {
  return [
    { label: "United States", value: "us" },
    { label: "Canada", value: "ca" }
  ];
}

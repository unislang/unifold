import { MAXIMUM_ERROR_SUMMARY_ITEMS } from "@unislang/unifold-catalog";
import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { isErrorSummaryItemList, validateErrorSummaryTargets } from "./error-summary-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const targetValidationView = {
  $children: [
    { $comp: CoreComponentType.Text, content: "Summary", id: "content" },
    {
      $comp: CoreComponentType.ErrorSummary,
      errors: [
        { message: "Missing", targetId: "absent" },
        { message: "Not a control", targetId: "content" },
        { message: "Enter a name", targetId: "name" }
      ],
      id: "errors"
    },
    { $comp: CoreComponentType.TextField, id: "name", label: "Name" }
  ],
  $comp: CoreComponentType.Stack,
  id: "root"
};

const targetValidationComponents = new Map([
  ["root", CoreComponentType.Stack],
  ["content", CoreComponentType.Text],
  ["errors", CoreComponentType.ErrorSummary],
  ["name", CoreComponentType.TextField]
]);

it("accepts exact bounded error items", () => {
  expect(isErrorSummaryItemList([{ message: "Enter a name", targetId: "name" }])).toBe(true);
  expect(isErrorSummaryItemList([])).toBe(true);
});

it("rejects malformed, excessive, and expanded error items", () => {
  expect(isErrorSummaryItemList("error")).toBe(false);
  expect(isErrorSummaryItemList([{ message: "", targetId: "name" }])).toBe(false);
  expect(isErrorSummaryItemList([{ message: "Error", targetId: "" }])).toBe(false);
  expect(isErrorSummaryItemList([{ message: "Error", secret: "x", targetId: "name" }])).toBe(false);
  expect(
    isErrorSummaryItemList(
      Array.from({ length: MAXIMUM_ERROR_SUMMARY_ITEMS + 1 }, () => ({
        message: "Error",
        targetId: "name"
      }))
    )
  ).toBe(false);
});

it("reports missing and non-control targets at exact paths", () => {
  const diagnostics: CompilerDiagnostic[] = [];
  validateErrorSummaryTargets(
    targetValidationView,
    targetValidationComponents,
    new Set(targetValidationComponents.keys()),
    diagnostics
  );
  expect(diagnostics.map(({ code, nodeId, path }) => ({ code, nodeId, path }))).toEqual([
    {
      code: DiagnosticCode.UnknownErrorSummaryTarget,
      nodeId: "errors",
      path: "/view/$children/1/errors/0/targetId"
    },
    {
      code: DiagnosticCode.InvalidErrorSummaryTarget,
      nodeId: "errors",
      path: "/view/$children/1/errors/1/targetId"
    }
  ]);
});

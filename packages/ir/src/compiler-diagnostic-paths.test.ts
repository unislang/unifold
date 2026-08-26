import { DiagnosticCode, DiagnosticSeverity } from "./enums.js";
import { expect, it } from "vitest";

import { remapCompilerDiagnosticPaths } from "./compiler-diagnostic-paths.js";

it("maps canonical node vocabulary back to authored layout pointers", () => {
  const input = {
    view: {
      $children: [{ $comp: "Missing", id: "field", label: true }],
      $comp: "Stack",
      id: "root"
    }
  };
  const sourcePointers = { field: "/variables/fields/0", root: "/layouts/0/template" };
  expect(path(input, "/view/$children/0/$comp", sourcePointers)).toBe("/variables/fields/0/type");
  expect(path(input, "/view/$children/0/label", sourcePointers)).toBe(
    "/variables/fields/0/props/label"
  );
});

it("leaves document diagnostics and unmapped nodes unchanged", () => {
  expect(path({}, "/schemaVersion", {})).toBe("/schemaVersion");
  expect(path([], "/schemaVersion", {})).toBe("/schemaVersion");
  expect(path({ view: { $comp: "Text" } }, "/view/$comp", {})).toBe("/view/$comp");
  expect(
    path({ view: { $children: "invalid", $comp: "Text", id: "root" } }, "/other", {
      root: "/template"
    })
  ).toBe("/other");
});

it("maps node, child, event, and identity suffixes without rewriting their vocabulary", () => {
  const input = {
    view: {
      $children: [{ $comp: "Text", events: { activated: "SAVE" }, id: "child" }],
      $comp: "Stack",
      id: "root"
    }
  };
  const pointers = { child: "/template/children/0", root: "/template" };
  expect(path(input, "/view", pointers)).toBe("/template");
  expect(path(input, "/view/id", pointers)).toBe("/template/id");
  expect(path(input, "/view/events/activated", pointers)).toBe("/template/events/activated");
  expect(path(input, "/view/$children/0", pointers)).toBe("/template/children/0");
  expect(path(input, "/view/$children/0/content", { root: "/template" })).toBe(
    "/template/children/0/content"
  );
});

function path(
  input: unknown,
  diagnosticPath: string,
  pointers: Readonly<Record<string, string>>
): string {
  return remapCompilerDiagnosticPaths(
    input,
    [
      {
        code: DiagnosticCode.InvalidNode,
        message: "invalid",
        path: diagnosticPath,
        severity: DiagnosticSeverity.Error
      }
    ],
    pointers
  )[0]?.path as string;
}

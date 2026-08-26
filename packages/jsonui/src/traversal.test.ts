import { expect, it } from "vitest";

import { JsonUiFeature, JsonUiProfileDiagnosticCode } from "./enums.js";
import { scanJsonUiView } from "./traversal.js";
import type { JsonUiProfileDiagnostic } from "./types.js";

it("rejects a cyclic view without recursing indefinitely", () => {
  const view: Record<string, unknown> = { $comp: "Box", id: "root" };
  view["$children"] = [view];
  const diagnostics: JsonUiProfileDiagnostic[] = [];
  scanJsonUiView(view, diagnostics);
  expect(diagnostics).toContainEqual(
    expect.objectContaining({ code: JsonUiProfileDiagnosticCode.TraversalCycle })
  );
});

it("does not treat action-shaped application data as an event action", () => {
  const diagnostics: JsonUiProfileDiagnostic[] = [];
  scanJsonUiView(
    { $comp: "Text", content: { audit: { $action: "record" } }, id: "message" },
    diagnostics
  );
  expect(diagnostics.map(({ feature }) => feature)).not.toContain(JsonUiFeature.Action);
});

it("bounds deeply nested property traversal", () => {
  const nested: Record<string, unknown> = {};
  let cursor = nested;
  for (let index = 0; index < 70; index += 1) {
    const next: Record<string, unknown> = {};
    cursor["next"] = next;
    cursor = next;
  }
  const diagnostics: JsonUiProfileDiagnostic[] = [];
  scanJsonUiView({ $comp: "Text", content: nested, id: "message" }, diagnostics);
  expect(diagnostics).toContainEqual(
    expect.objectContaining({ code: JsonUiProfileDiagnosticCode.ResourceLimit })
  );
});

it("accepts exactly 10000 components and rejects the next component", () => {
  const accepted: JsonUiProfileDiagnostic[] = [];
  scanJsonUiView(flatView(10_000), accepted);
  expect(accepted).toEqual([]);
  const rejected: JsonUiProfileDiagnostic[] = [];
  scanJsonUiView(flatView(10_001), rejected);
  expect(rejected).toContainEqual(
    expect.objectContaining({
      code: JsonUiProfileDiagnosticCode.ResourceLimit,
      message: expect.stringContaining("component node")
    })
  );
});

function flatView(componentCount: number): Record<string, unknown> {
  const children = Array.from({ length: componentCount - 1 }, (_, index) => ({
    $comp: "Text",
    id: `node-${index}`
  }));
  return { $children: children, $comp: "Box", id: "root" };
}

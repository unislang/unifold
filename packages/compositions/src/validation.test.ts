import { describe, expect, it } from "vitest";

import {
  CompositionDiagnosticCode,
  CompositionExpansionStatus,
  expandComposedUiDocument,
  validateComposedDocument
} from "./index.js";
import { composedDocument, profileInstance } from "./expander.test-data.js";

describe("composed document validation", () => {
  it("returns schema diagnostics for malformed input", () => {
    const validation = validateComposedDocument({ compositions: [], view: { id: "missing-comp" } });

    expect(validation.document).toBeUndefined();
    expect(
      validation.diagnostics.every(({ code }) => code === CompositionDiagnosticCode.InvalidDocument)
    ).toBe(true);
  });

  it("rejects ids containing the reserved namespace delimiter", () => {
    const source = composedDocument(undefined, profileInstance({ id: "unsafe::id" }));
    const result = expandComposedUiDocument(source);

    expect(result.status).toBe(CompositionExpansionStatus.Invalid);
    expect(result.diagnostics[0]?.code).toBe(CompositionDiagnosticCode.InvalidDocument);
  });

  it("rejects prototype-sensitive property names", () => {
    const source = JSON.parse(JSON.stringify(composedDocument())) as Record<string, unknown>;
    const definitions = source["compositions"] as Record<string, unknown>[];
    const parameters = definitions[0]?.["parameters"] as Record<string, unknown>;
    parameters["__proto__"] = { required: false, type: "string" };
    const result = expandComposedUiDocument(source);

    expect(result.status).toBe(CompositionExpansionStatus.Invalid);
    expect(
      result.diagnostics.some(({ code }) => code === CompositionDiagnosticCode.InvalidDocument)
    ).toBe(true);
  });
});

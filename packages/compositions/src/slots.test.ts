import { expect, it } from "vitest";

import {
  CompositionDiagnosticCode,
  expandComposedUiDocument,
  type CompositionDefinition
} from "./index.js";
import {
  applicationView,
  composedDocument,
  profileDefinition,
  profileInstance
} from "./expander.test-data.js";

it("rejects missing required and overfilled single-value slots", () => {
  const missing = expandWithSlots({ actions: [] });
  const multiple = expandWithSlots({
    actions: [
      { $comp: "Button", id: "one" },
      { $comp: "Button", id: "two" }
    ]
  });

  expect(codes(missing)).toContain(CompositionDiagnosticCode.MissingSlot);
  expect(codes(multiple)).toContain(CompositionDiagnosticCode.MultipleSlot);
});

it("rejects provided slots that are not declared", () => {
  const instance = profileInstance({
    slots: {
      actions: [{ $comp: "Button", id: "save" }],
      aside: [{ $comp: "Text", id: "help" }]
    }
  });
  const result = expandComposedUiDocument(composedDocument(undefined, applicationView(instance)));

  expect(codes(result)).toContain(CompositionDiagnosticCode.UnknownSlot);
});

it("validates duplicate declarations and missing placeholders while unused", () => {
  const definition = profileDefinition({
    slots: [
      { multiple: false, name: "actions", required: false },
      { multiple: true, name: "actions", required: false }
    ],
    template: { $comp: "Composition", id: "root" }
  });
  const result = expandComposedUiDocument(composedDocument([definition], plainView()));

  expect(codes(result)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.DuplicateSlot,
      CompositionDiagnosticCode.MissingSlotPlaceholder
    ])
  );
});

it("rejects undeclared and repeated template placeholders", () => {
  const definition = profileDefinition({ template: repeatedPlaceholderTemplate() });
  const result = expandComposedUiDocument(composedDocument([definition], plainView()));

  expect(codes(result)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.DuplicateSlotPlaceholder,
      CompositionDiagnosticCode.UnknownSlot
    ])
  );
});

function expandWithSlots(slots: Record<string, readonly object[]>) {
  const instance = profileInstance({ slots: slots as never });
  return expandComposedUiDocument(composedDocument(undefined, applicationView(instance)));
}

function codes(result: ReturnType<typeof expandComposedUiDocument>): CompositionDiagnosticCode[] {
  return result.diagnostics.map(({ code }) => code);
}

function plainView(): ReturnType<typeof applicationView> {
  return applicationView({ $comp: "Text", id: "content" });
}

function repeatedPlaceholderTemplate(): CompositionDefinition["template"] {
  return {
    $children: [{ $slot: "actions" }, { $slot: "actions" }, { $slot: "aside" }],
    $comp: "Composition",
    id: "root"
  };
}

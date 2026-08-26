import { expect, it } from "vitest";
import { UiCompositionExportKind, UiCompositionSelectionKind } from "@unislang/unifold-contracts";

import {
  CompositionContractVersion,
  CompositionDiagnosticCode,
  CompositionExpansionStatus,
  CompositionParameterType,
  expandComposedUiDocument,
  type CompositionDefinition
} from "./index.js";
import {
  applicationView,
  composedDocument,
  profileDefinition,
  profileInstance
} from "./expander.test-data.js";

it("reports missing, unknown, and invalid instance parameters atomically", () => {
  const instance = profileInstance({ parameters: { extra: true, label: 42 } });
  const invalid = expandComposedUiDocument(composedDocument(undefined, applicationView(instance)));
  const missing = expandComposedUiDocument(
    composedDocument(undefined, applicationView(profileInstance({ parameters: {} })))
  );

  expect(codes(invalid)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.UnknownParameter,
      CompositionDiagnosticCode.InvalidParameter
    ])
  );
  expect(codes(missing)).toContain(CompositionDiagnosticCode.MissingParameter);
  expect(invalid.document).toBeUndefined();
  expect(invalid.exportsByInstanceId).toEqual({});
});

it("validates scalar defaults and template references in unused definitions", () => {
  const definition = profileDefinition({
    parameters: {
      label: { default: 7, required: false, type: CompositionParameterType.String }
    },
    template: { $comp: "Composition", id: "root", value: { $parameter: "absent" } }
  });
  const result = expandComposedUiDocument(composedDocument([definition], plainView()));

  expect(codes(result)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.InvalidParameter,
      CompositionDiagnosticCode.UnknownParameter
    ])
  );
});

it("rejects malformed parameter references", () => {
  const definition = profileDefinition({
    template: {
      $comp: "Composition",
      id: "root",
      label: { $parameter: "label", suffix: "!" }
    }
  });
  const result = expandComposedUiDocument(composedDocument([definition], plainView()));

  expect(codes(result)).toContain(CompositionDiagnosticCode.InvalidParameterReference);
});

it("validates duplicate ids and unknown exports in unused definitions", () => {
  const definition = profileDefinition({
    exports: {
      missing: {
        kind: UiCompositionExportKind.Selection,
        localId: "absent",
        selection: UiCompositionSelectionKind.Snapshot
      }
    },
    slots: [],
    template: {
      $children: [
        { $comp: "Text", id: "same" },
        { $comp: "Text", id: "same" }
      ],
      $comp: "Composition",
      id: "root"
    }
  });
  const result = expandComposedUiDocument(composedDocument([definition], plainView()));

  expect(codes(result)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.DuplicateNodeId,
      CompositionDiagnosticCode.UnknownExport
    ])
  );
});

it("reports duplicate definitions and unknown nested compositions", () => {
  const unknown = profileDefinition({
    slots: [],
    template: nestedTemplate("Missing")
  });
  const result = expandComposedUiDocument(composedDocument([unknown, unknown], plainView()));

  expect(codes(result)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.DuplicateDefinition,
      CompositionDiagnosticCode.UnknownComposition
    ])
  );
});

it("detects definition cycles even when definitions are unused", () => {
  const first = graphDefinition("First", "Second");
  const second = graphDefinition("Second", "First");
  const result = expandComposedUiDocument(composedDocument([first, second], plainView()));

  expect(codes(result)).toContain(CompositionDiagnosticCode.Cycle);
});

it("enforces a caller-selected maximum nesting depth", () => {
  const first = graphDefinition("First", "Second");
  const second = leafDefinition("Second");
  const view = applicationView({ $compose: "First", $version: "1", id: "first" });
  const result = expandComposedUiDocument(composedDocument([first, second], view), {
    maxDepth: 1
  });

  expect(codes(result)).toContain(CompositionDiagnosticCode.MaxDepth);
  expect(result.status).toBe(CompositionExpansionStatus.Invalid);
});

function codes(result: ReturnType<typeof expandComposedUiDocument>): CompositionDiagnosticCode[] {
  return result.diagnostics.map(({ code }) => code);
}

function plainView(): ReturnType<typeof applicationView> {
  return applicationView({ $comp: "Text", id: "content" });
}

function nestedTemplate(name: string): CompositionDefinition["template"] {
  return {
    $children: [{ $compose: name, $version: "1", id: "nested" }],
    $comp: "Composition",
    id: "root"
  };
}

function graphDefinition(name: string, nested: string): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version1,
    exports: {},
    name,
    parameters: {},
    slots: [],
    template: nestedTemplate(nested),
    version: "1"
  };
}

function leafDefinition(name: string): CompositionDefinition {
  return {
    ...graphDefinition(name, "unused"),
    template: { $comp: "Composition", id: "root" }
  };
}

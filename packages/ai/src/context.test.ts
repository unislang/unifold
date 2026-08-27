import type { JsonObject } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { buildUiAiContext } from "./context.js";
import {
  MAXIMUM_AI_CONTEXT_BYTES,
  MAXIMUM_AI_CONTEXT_DEFINITIONS,
  MAXIMUM_AI_CONTEXT_PROPERTIES,
  MAXIMUM_AI_PATCH_OPERATIONS,
  UiAiContextDiagnosticCode,
  UiAiContextStatus,
  UiAiContextVersion,
  UiAiRedactionStrategy
} from "./types.js";
import { canonicalJson } from "./fingerprint.js";
import { aiTestComponentDefinitions, aiTestDocument } from "./proposal.test-data.js";

it("projects authoritative catalog capabilities and omits declared sensitive values", () => {
  const document = privateDocument();
  const result = buildUiAiContext({
    componentDefinitions: aiTestComponentDefinitions(),
    document
  });
  expect(result.status).toBe(UiAiContextStatus.Ready);
  if (result.status !== UiAiContextStatus.Ready) return;
  const serialized = canonicalJson(result.context);
  expect(serialized).not.toContain("PRIVATE_FORM_ERROR");
  expect(serialized).not.toContain("PRIVATE_FIELD_VALUE");
  expect(serialized).not.toContain("PRIVATE_ERROR");
  expect(serialized).toContain("PRIVATE_FORM_LABEL");
  expect(serialized).toContain('"name":"name"');
  expect(serialized).not.toContain("defaultValue");
  expect(result.context.version).toBe(UiAiContextVersion.Version1);
  expect(result.context.redaction).toBe(UiAiRedactionStrategy.OmitSensitiveProperties);
  expect(result.context.policy.maximumOperations).toBe(MAXIMUM_AI_PATCH_OPERATIONS);
  expect(new TextEncoder().encode(serialized).byteLength).toBeLessThanOrEqual(
    MAXIMUM_AI_CONTEXT_BYTES
  );
  expect(canonicalJson(document)).toContain("PRIVATE_FIELD_VALUE");
});

it("fails closed when the document references an absent definition", () => {
  const componentDefinitions = aiTestComponentDefinitions();
  const result = buildUiAiContext({
    componentDefinitions: {
      ...componentDefinitions,
      definitions: componentDefinitions.definitions.slice(0, 1)
    },
    document: aiTestDocument()
  });
  expect(rejectionCode(result)).toBe(UiAiContextDiagnosticCode.UnknownComponent);
});

it("rejects mismatched catalog authority", () => {
  const componentDefinitions = aiTestComponentDefinitions();
  const result = buildUiAiContext({
    componentDefinitions: {
      ...componentDefinitions,
      catalog: { ...componentDefinitions.catalog, version: "2.0.0" }
    },
    document: aiTestDocument()
  });
  expect(rejectionCode(result)).toBe(UiAiContextDiagnosticCode.CatalogMismatch);
});

it("enforces exact definition and property-count limits", () => {
  const source = aiTestComponentDefinitions();
  const definition = firstDefinition(source);
  const definitionsResult = buildUiAiContext({
    componentDefinitions: {
      ...source,
      definitions: Array.from({ length: MAXIMUM_AI_CONTEXT_DEFINITIONS + 1 }, () => definition)
    },
    document: aiTestDocument()
  });
  expect(rejectionCode(definitionsResult)).toBe(UiAiContextDiagnosticCode.DefinitionLimitExceeded);
  const propertiesResult = buildUiAiContext({
    componentDefinitions: oversizedProperties(source),
    document: aiTestDocument()
  });
  expect(rejectionCode(propertiesResult)).toBe(UiAiContextDiagnosticCode.PropertyLimitExceeded);
});

it("reports the exact encoded byte size when projected context is too large", () => {
  const source = aiTestComponentDefinitions();
  const first = firstDefinition(source);
  const result = buildUiAiContext({
    componentDefinitions: {
      ...source,
      definitions: [{ ...first, purpose: "x".repeat(MAXIMUM_AI_CONTEXT_BYTES) }]
    },
    document: formOnlyDocument()
  });
  expect(rejectionCode(result)).toBe(UiAiContextDiagnosticCode.ContextBytesExceeded);
  expect(rejectionMessage(result)).toMatch(
    new RegExp(`AI context is \\d+ bytes; the maximum is ${MAXIMUM_AI_CONTEXT_BYTES}\\.`)
  );
});

function privateDocument(): JsonObject {
  const document = aiTestDocument();
  const view = document["view"] as JsonObject;
  const children = view["$children"] as readonly JsonObject[];
  const field = children[0] ?? {};
  return {
    ...document,
    view: {
      ...view,
      $children: [
        {
          ...field,
          errorMessage: "PRIVATE_ERROR",
          label: "PRIVATE_FIELD_LABEL",
          value: "PRIVATE_FIELD_VALUE"
        }
      ],
      errorMessages: ["PRIVATE_FORM_ERROR"],
      label: "PRIVATE_FORM_LABEL"
    }
  };
}

function oversizedProperties(source: ReturnType<typeof aiTestComponentDefinitions>) {
  const first = source.definitions[0];
  if (first === undefined) throw new Error("Missing fixture.");
  const property = first.catalogDescriptor.properties[0];
  if (property === undefined) throw new Error("Missing property fixture.");
  return {
    ...source,
    definitions: [
      {
        ...first,
        catalogDescriptor: {
          ...first.catalogDescriptor,
          properties: Array.from({ length: MAXIMUM_AI_CONTEXT_PROPERTIES + 1 }, () => property)
        }
      }
    ]
  };
}

function formOnlyDocument(): JsonObject {
  const document = aiTestDocument();
  return { ...document, view: { $comp: "Form", id: "form", label: "Private" } };
}

function rejectionCode(result: ReturnType<typeof buildUiAiContext>) {
  if (result.status !== UiAiContextStatus.Rejected) return undefined;
  return result.diagnostics[0]?.code;
}

function rejectionMessage(result: ReturnType<typeof buildUiAiContext>): string | undefined {
  if (result.status !== UiAiContextStatus.Rejected) return undefined;
  return result.diagnostics[0]?.message;
}

function firstDefinition(source: ReturnType<typeof aiTestComponentDefinitions>) {
  const definition = source.definitions[0];
  if (definition === undefined) throw new Error("Missing fixture.");
  return definition;
}

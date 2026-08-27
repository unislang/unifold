import type { SemanticGraph } from "@unislang/unifold-contracts";
import schema from "@unislang/unifold-contracts/schemas/semantic-graph.schema.json" with { type: "json" };
import { compileSchema, draft2020, type JsonError, type JsonSchema } from "json-schema-library";

const validator = compileSchema(schema as JsonSchema, {
  drafts: [draft2020],
  throwOnInvalidRef: true,
  throwOnInvalidSchema: true
});

export interface SemanticSchemaDiagnostic {
  readonly keyword: string;
  readonly message: string;
  readonly path: string;
}

export class SemanticGraphValidationError extends Error {
  readonly diagnostics: readonly SemanticSchemaDiagnostic[];

  constructor(diagnostics: readonly SemanticSchemaDiagnostic[]) {
    super("Semantic graph failed JSON Schema validation.");
    this.name = "SemanticGraphValidationError";
    this.diagnostics = diagnostics;
  }
}

export function assertSemanticGraph(value: unknown): asserts value is SemanticGraph {
  const result = validator.validate(value);
  if (result.valid) return;
  throw new SemanticGraphValidationError(readDiagnostics(result.errors));
}

function readDiagnostics(errors: readonly JsonError[]): SemanticSchemaDiagnostic[] {
  return errors.map((error) => ({
    keyword: schemaKeyword(error),
    message: error.message || "Schema validation failed.",
    path: diagnosticPath(error)
  }));
}

const keywordAliases: Readonly<Record<string, string>> = {
  "invalid-data": "false schema",
  "invalid-property-name": "propertyNames",
  "missing-one-of-declarator": "oneOf",
  "missing-one-of-property": "oneOf",
  "multiple-one-of": "oneOf",
  "no-additional-properties": "additionalProperties",
  "one-of-property": "oneOf",
  "required-property": "required"
};

function schemaKeyword(error: JsonError): string {
  const errorCode = String(error.code);
  const code = errorCode.endsWith("-error") ? errorCode.slice(0, -6) : errorCode;
  const keyword = keywordAliases[code] ?? code;
  return keyword.replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase());
}

function diagnosticPath(error: JsonError): string {
  const pointer = error.data.pointer.slice(1);
  const path = isAdditionalProperty(error) ? parentPointer(pointer) : pointer;
  return path || "/";
}

function isAdditionalProperty(error: JsonError): boolean {
  return error.code === "no-additional-properties-error";
}

function parentPointer(pointer: string): string {
  const segments = pointer.split("/");
  segments.pop();
  return segments.join("/");
}

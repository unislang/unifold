import schema from "@unislang/unifold-contracts/schemas/semantic-graph.schema.json" with { type: "json" };
import { compileSchema, draft2020, type JsonError, type JsonSchema } from "json-schema-library";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

const semanticSchema = compileSchema(schema as JsonSchema, {
  drafts: [draft2020],
  throwOnInvalidRef: true,
  throwOnInvalidSchema: true
});

export function validateSemanticGraph(value: unknown, diagnostics: CompilerDiagnostic[]): void {
  if (value === undefined) return;
  semanticSchema.validate(value).errors.forEach((error) => {
    diagnostics.push(
      errorDiagnostic(DiagnosticCode.InvalidSemanticGraph, error.message, semanticPath(error))
    );
  });
}

function semanticPath(error: JsonError): string {
  const path = `/semantics${error.data.pointer.slice(1)}`;
  const key = error.data["key"];
  if (error.code !== "required-property-error" || typeof key !== "string") return path;
  return `${path}/${escapePointerToken(key)}`;
}

function escapePointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

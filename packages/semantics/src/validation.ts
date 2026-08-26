import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

import type { SemanticGraph } from "@unislang/unifold-contracts";
import schema from "@unislang/unifold-contracts/schemas/semantic-graph.schema.json" with { type: "json" };

const validator = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true
}).compile<SemanticGraph>(schema);

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
  if (validator(value)) return;
  throw new SemanticGraphValidationError(readDiagnostics(validator.errors));
}

function readDiagnostics(
  errors: readonly ErrorObject[] | null | undefined
): SemanticSchemaDiagnostic[] {
  return (errors ?? []).map((error) => ({
    keyword: error.keyword,
    message: error.message ?? "Schema validation failed.",
    path: error.instancePath || "/"
  }));
}

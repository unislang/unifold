import schema from "@unislang/unifold-contracts/schemas/derived-rule.schema.json" with { type: "json" };
import type { UiDerivedRuleDefinition } from "@unislang/unifold-contracts";
import {
  RuleDiagnosticCode,
  compileDerivedRules,
  type RuleCompileNode,
  type RuleDiagnostic
} from "@unislang/unifold-rules";
import { compileSchema, draft2020, type JsonError, type JsonSchema } from "json-schema-library";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { nodeKindForComponent } from "./node-kind.js";
import type { CompilerDiagnostic } from "./types.js";

const derivedRuleSchema = compileSchema(schema as JsonSchema, {
  drafts: [draft2020],
  throwOnInvalidRef: true,
  throwOnInvalidSchema: true
});

const DIAGNOSTIC_CODES: Readonly<Record<RuleDiagnosticCode, DiagnosticCode>> = {
  [RuleDiagnosticCode.BudgetExceeded]: DiagnosticCode.DerivedRuleBudgetExceeded,
  [RuleDiagnosticCode.Cycle]: DiagnosticCode.DerivedRuleCycle,
  [RuleDiagnosticCode.DuplicateInputName]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.DuplicateRuleId]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.InvalidExpression]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.InvalidInput]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.InvalidOutput]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.InvalidRule]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.MultipleWriters]: DiagnosticCode.DerivedRuleMultipleWriters,
  [RuleDiagnosticCode.UndeclaredInput]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.UnknownNode]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.UnknownOperator]: DiagnosticCode.InvalidDerivedRule,
  [RuleDiagnosticCode.UnusedInput]: DiagnosticCode.InvalidDerivedRule
};

export function validateDerivedRules(
  value: unknown,
  nodeComponents: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === undefined) return;
  validateDefinedRules(value, nodeComponents, diagnostics);
}

function validateDefinedRules(
  value: unknown,
  nodeComponents: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!Array.isArray(value)) return addInvalidCollection(diagnostics);
  const definitions = validatedDefinitions(value, diagnostics);
  if (definitions.length !== value.length) return;
  const result = compileDerivedRules(definitions, compileNodes(nodeComponents));
  result.diagnostics.forEach((diagnostic) => addRuleDiagnostic(diagnostic, diagnostics));
}

function validatedDefinitions(
  values: readonly unknown[],
  diagnostics: CompilerDiagnostic[]
): UiDerivedRuleDefinition[] {
  const definitions: UiDerivedRuleDefinition[] = [];
  values.forEach((value, index) => validateDefinition(value, index, definitions, diagnostics));
  return definitions;
}

function validateDefinition(
  value: unknown,
  index: number,
  definitions: UiDerivedRuleDefinition[],
  diagnostics: CompilerDiagnostic[]
): void {
  const errors = derivedRuleSchema.validate(value).errors;
  errors.forEach((error) => addSchemaDiagnostic(error, index, diagnostics));
  if (errors.length === 0) definitions.push(value as UiDerivedRuleDefinition);
}

function compileNodes(nodeComponents: ReadonlyMap<string, string>): RuleCompileNode[] {
  const nodes: RuleCompileNode[] = [];
  nodeComponents.forEach((component, id) => addCompileNode(id, component, nodes));
  return nodes;
}

function addCompileNode(id: string, component: string, nodes: RuleCompileNode[]): void {
  const kind = nodeKindForComponent(component);
  if (kind !== undefined) nodes.push({ id, kind });
}

function addRuleDiagnostic(diagnostic: RuleDiagnostic, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(DIAGNOSTIC_CODES[diagnostic.code], diagnostic.message, diagnostic.path)
  );
}

function addSchemaDiagnostic(
  error: JsonError,
  index: number,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidDerivedRule, error.message, schemaErrorPath(error, index))
  );
}

function schemaErrorPath(error: JsonError, index: number): string {
  const base = `/rules/${index}${error.data.pointer.slice(1)}`;
  const key = error.data["key"];
  if (error.code !== "required-property-error") return base;
  return typeof key === "string" ? `${base}/${escapePointerToken(key)}` : base;
}

function escapePointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function addInvalidCollection(diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidDerivedRule, "Rules must be an array.", "/rules")
  );
}

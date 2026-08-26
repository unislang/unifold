import type { JsonArray, JsonValue } from "@unislang/unifold-contracts";

import { JsonLogicOperator, RuleDiagnosticCode } from "./enums.js";
import type { RuleDiagnostic, RuleExpressionAnalysis } from "./types.js";

interface ProfileLimits {
  readonly maxDepth: number;
  readonly maxNodes: number;
}

interface PendingValue {
  readonly depth: number;
  readonly path: string;
  readonly value: JsonValue;
}

interface AnalysisState {
  readonly declaredInputs: ReadonlySet<string>;
  readonly diagnostics: RuleDiagnostic[];
  maxDepth: number;
  nodeCount: number;
  readonly pending: PendingValue[];
  readonly referencedInputs: Set<string>;
  readonly ruleId: string;
}

interface OperatorArity {
  readonly maximum: number;
  readonly minimum: number;
}

const MANY = 64;
const OPERATOR_ARITIES = new Map<JsonLogicOperator, OperatorArity>([
  [JsonLogicOperator.Add, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.And, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.Boolean, { minimum: 1, maximum: 1 }],
  [JsonLogicOperator.Cat, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.Divide, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.Equal, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.GreaterThan, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.GreaterThanOrEqual, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.If, { minimum: 3, maximum: 3 }],
  [JsonLogicOperator.In, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.Length, { minimum: 1, maximum: 1 }],
  [JsonLogicOperator.LessThan, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.LessThanOrEqual, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.Max, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.Merge, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.Min, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.Modulo, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.Multiply, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.Not, { minimum: 1, maximum: 1 }],
  [JsonLogicOperator.NotEqual, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.Or, { minimum: 1, maximum: MANY }],
  [JsonLogicOperator.StrictEqual, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.StrictNotEqual, { minimum: 2, maximum: 2 }],
  [JsonLogicOperator.Substr, { minimum: 2, maximum: 3 }],
  [JsonLogicOperator.Subtract, { minimum: 1, maximum: 2 }],
  [JsonLogicOperator.Ternary, { minimum: 3, maximum: 3 }]
]);

export function analyzeJsonLogicExpression(
  expression: JsonValue,
  declaredInputs: ReadonlySet<string>,
  ruleId: string,
  limits: ProfileLimits
): RuleExpressionAnalysis {
  const state = createState(expression, declaredInputs, ruleId);
  while (state.pending.length > 0) visitNext(state, limits);
  return {
    diagnostics: state.diagnostics,
    maxDepth: state.maxDepth,
    nodeCount: state.nodeCount,
    referencedInputs: [...state.referencedInputs].sort()
  };
}

function createState(
  expression: JsonValue,
  declaredInputs: ReadonlySet<string>,
  ruleId: string
): AnalysisState {
  return {
    declaredInputs,
    diagnostics: [],
    maxDepth: 0,
    nodeCount: 0,
    pending: [{ depth: 1, path: "/expression", value: expression }],
    referencedInputs: new Set(),
    ruleId
  };
}

function visitNext(state: AnalysisState, limits: ProfileLimits): void {
  const current = state.pending.pop();
  if (current === undefined) return;
  recordSize(current, state, limits);
  visitValue(current, state);
}

function recordSize(current: PendingValue, state: AnalysisState, limits: ProfileLimits): void {
  state.nodeCount += 1;
  state.maxDepth = Math.max(state.maxDepth, current.depth);
  if (state.nodeCount > limits.maxNodes) addBudgetDiagnostic(current.path, state);
  if (current.depth > limits.maxDepth) addBudgetDiagnostic(current.path, state);
}

function visitValue(current: PendingValue, state: AnalysisState): void {
  const value = current.value;
  if (Array.isArray(value)) return visitArray(value, current, state);
  if (isRecord(value)) visitRecord(value, current, state);
  validateFiniteNumber(value, current.path, state);
}

function validateFiniteNumber(value: JsonValue, path: string, state: AnalysisState): void {
  if (typeof value !== "number") return;
  if (Number.isFinite(value)) return;
  addDiagnostic(RuleDiagnosticCode.InvalidExpression, "Numbers must be finite.", path, state);
}

function visitArray(value: JsonArray, current: PendingValue, state: AnalysisState): void {
  if (value.length > MANY) {
    addDiagnostic(
      RuleDiagnosticCode.BudgetExceeded,
      "Expression arrays are limited to 64 items.",
      current.path,
      state
    );
  }
  value.forEach((item, index) =>
    state.pending.push({ depth: current.depth + 1, path: `${current.path}/${index}`, value: item })
  );
}

function visitRecord(
  value: Readonly<Record<string, JsonValue>>,
  current: PendingValue,
  state: AnalysisState
): void {
  const entries = Object.entries(value);
  if (entries.length === 0) return;
  if (entries.length !== 1) return addShapeDiagnostic(current.path, state);
  visitOperator(entries[0] as [string, JsonValue], current, state);
}

function visitOperator(
  [operatorName, payload]: [string, JsonValue],
  current: PendingValue,
  state: AnalysisState
): void {
  if (!isAllowedOperator(operatorName))
    return addOperatorDiagnostic(operatorName, current.path, state);
  if (operatorName === JsonLogicOperator.Variable)
    return visitVariable(payload, current.path, state);
  validateArity(operatorName, payload, current.path, state);
  state.pending.push({
    depth: current.depth + 1,
    path: `${current.path}/${operatorName}`,
    value: payload
  });
}

function visitVariable(payload: JsonValue, path: string, state: AnalysisState): void {
  if (!isVariableName(payload)) return addVariableShapeDiagnostic(path, state);
  validateDeclaredVariable(payload, path, state);
}

function validateDeclaredVariable(input: string, path: string, state: AnalysisState): void {
  if (!state.declaredInputs.has(input)) return addUndeclaredDiagnostic(input, path, state);
  state.referencedInputs.add(input);
}

function isVariableName(value: JsonValue): value is string {
  return typeof value === "string" && value.length > 0;
}

function validateArity(
  operator: JsonLogicOperator,
  payload: JsonValue,
  path: string,
  state: AnalysisState
): void {
  const limits = OPERATOR_ARITIES.get(operator) as OperatorArity;
  if (withinArity(operandCount(payload), limits)) return;
  addDiagnostic(
    RuleDiagnosticCode.InvalidExpression,
    `Invalid ${operator} operand count.`,
    path,
    state
  );
}

function operandCount(payload: JsonValue): number {
  return Array.isArray(payload) ? payload.length : 1;
}

function withinArity(count: number, limits: OperatorArity): boolean {
  return count >= limits.minimum && count <= limits.maximum;
}

function isAllowedOperator(value: string): value is JsonLogicOperator {
  return value === JsonLogicOperator.Variable || OPERATOR_ARITIES.has(value as JsonLogicOperator);
}

function isRecord(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addShapeDiagnostic(path: string, state: AnalysisState): void {
  addDiagnostic(
    RuleDiagnosticCode.InvalidExpression,
    "Operator objects require exactly one key.",
    path,
    state
  );
}

function addOperatorDiagnostic(operator: string, path: string, state: AnalysisState): void {
  addDiagnostic(
    RuleDiagnosticCode.UnknownOperator,
    `Operator is not allowlisted: ${operator}.`,
    path,
    state
  );
}

function addVariableShapeDiagnostic(path: string, state: AnalysisState): void {
  addDiagnostic(
    RuleDiagnosticCode.InvalidExpression,
    "var requires one declared input name.",
    path,
    state
  );
}

function addUndeclaredDiagnostic(input: string, path: string, state: AnalysisState): void {
  addDiagnostic(
    RuleDiagnosticCode.UndeclaredInput,
    `Input is not declared: ${input}.`,
    path,
    state
  );
}

function addBudgetDiagnostic(path: string, state: AnalysisState): void {
  addDiagnostic(RuleDiagnosticCode.BudgetExceeded, "Expression budget exceeded.", path, state);
}

function addDiagnostic(
  code: RuleDiagnosticCode,
  message: string,
  path: string,
  state: AnalysisState
): void {
  if (state.diagnostics.some((diagnostic) => diagnostic.code === code && diagnostic.path === path))
    return;
  state.diagnostics.push({ code, message, path, ruleId: state.ruleId });
}

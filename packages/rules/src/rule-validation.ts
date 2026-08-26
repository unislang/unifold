import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  UiNodeKind,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import type { RuleGraphSeed } from "./dependency-graph.js";
import { inputDependency, outputDependencies, primaryOutputDependency } from "./dependencies.js";
import { RuleDiagnosticCode } from "./enums.js";
import { analyzeJsonLogicExpression } from "./profile.js";
import { addRuleCountBudgetDiagnostic, prefixRuleDiagnostics } from "./rule-diagnostics.js";
import type { RuleCompileNode, RuleCompileOptions, RuleDiagnostic } from "./types.js";
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
const STATE_POINTER = /^\/(?:base|control|properties|attributes)(?:\/(?:[^~/]|~[01])*)*$/;
interface RuleValidationContext {
  readonly diagnostics: RuleDiagnostic[];
  readonly limits: Required<RuleCompileOptions>;
  readonly nodes: ReadonlyMap<string, RuleCompileNode>;
}

export function createRuleValidationContext(
  nodes: readonly RuleCompileNode[],
  options: RuleCompileOptions
): RuleValidationContext {
  return {
    diagnostics: [],
    limits: resolvedOptions(options),
    nodes: new Map(nodes.map((node) => [node.id, node]))
  };
}

export function validateRuleCollection(
  definitions: readonly UiDerivedRuleDefinition[],
  context: RuleValidationContext
): void {
  if (definitions.length > context.limits.maxRules) {
    addRuleCountBudgetDiagnostic(context.diagnostics);
  }
  const seen = new Set<string>();
  definitions.forEach((definition, index) => validateRuleId(definition.id, index, seen, context));
}

export function compileRuleSeed(
  definition: UiDerivedRuleDefinition,
  index: number,
  context: RuleValidationContext
): RuleGraphSeed | undefined {
  const before = context.diagnostics.length;
  validateRuleShape(definition, index, context);
  const declared = validateInputs(definition, index, context);
  validateOutput(definition, index, context);
  const analysis = analyzeJsonLogicExpression(definition.expression, declared, definition.id, {
    maxDepth: context.limits.maxExpressionDepth,
    maxNodes: context.limits.maxExpressionNodes
  });
  context.diagnostics.push(...prefixRuleDiagnostics(analysis.diagnostics, index));
  addUnusedInputDiagnostics(definition, analysis.referencedInputs, index, context);
  if (context.diagnostics.length !== before) return undefined;
  return createSeed(definition, analysis.referencedInputs);
}

function resolvedOptions(options: RuleCompileOptions): Required<RuleCompileOptions> {
  return {
    maxExpressionDepth: valueOrDefault(options.maxExpressionDepth, 32),
    maxExpressionNodes: valueOrDefault(options.maxExpressionNodes, 256),
    maxRules: valueOrDefault(options.maxRules, 10_000)
  };
}

function valueOrDefault(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}

function validateRuleId(
  id: string,
  index: number,
  seen: Set<string>,
  context: RuleValidationContext
): void {
  if (!IDENTIFIER.test(id)) {
    addRuleDiagnostic(RuleDiagnosticCode.InvalidRule, "Invalid rule ID.", index, id, context);
  }
  addDuplicateRuleDiagnostic(id, index, seen, context);
  seen.add(id);
}

function addDuplicateRuleDiagnostic(
  id: string,
  index: number,
  seen: ReadonlySet<string>,
  context: RuleValidationContext
): void {
  if (!seen.has(id)) return;
  addRuleDiagnostic(
    RuleDiagnosticCode.DuplicateRuleId,
    `Duplicate rule ID: ${id}.`,
    index,
    id,
    context
  );
}

function validateRuleShape(
  definition: UiDerivedRuleDefinition,
  index: number,
  context: RuleValidationContext
): void {
  if (definition.schemaVersion !== UiDerivedRuleSchemaVersion.Version1) {
    addRuleDiagnostic(
      RuleDiagnosticCode.InvalidRule,
      "Unsupported rule schema version.",
      index,
      definition.id,
      context
    );
  }
  validateInputCount(definition, index, context);
}

function validateInputCount(
  definition: UiDerivedRuleDefinition,
  index: number,
  context: RuleValidationContext
): void {
  if (definition.inputs.length >= 1 && definition.inputs.length <= 64) return;
  addRuleDiagnostic(
    RuleDiagnosticCode.InvalidInput,
    "Rules require 1 to 64 inputs.",
    index,
    definition.id,
    context
  );
}

function validateInputs(
  definition: UiDerivedRuleDefinition,
  index: number,
  context: RuleValidationContext
): ReadonlySet<string> {
  const names = new Set<string>();
  definition.inputs.forEach((input, inputIndex) => {
    validateInput(input, definition.id, index, inputIndex, names, context);
    names.add(input.name);
  });
  return names;
}

function validateInput(
  input: UiDerivedRuleDefinition["inputs"][number],
  ruleId: string,
  ruleIndex: number,
  inputIndex: number,
  names: ReadonlySet<string>,
  context: RuleValidationContext
): void {
  const path = `/rules/${ruleIndex}/inputs/${inputIndex}`;
  validateInputShape(input.name, input.pointer, path, ruleId, context);
  validateInputName(input.name, names, path, ruleId, context);
  validateInputNode(input.nodeId, path, ruleId, context);
}

function validateInputShape(
  name: string,
  pointer: string,
  path: string,
  ruleId: string,
  context: RuleValidationContext
): void {
  if (IDENTIFIER.test(name) && STATE_POINTER.test(pointer)) return;
  addPathDiagnostic(RuleDiagnosticCode.InvalidInput, "Invalid rule input.", path, ruleId, context);
}

function validateInputName(
  name: string,
  names: ReadonlySet<string>,
  path: string,
  ruleId: string,
  context: RuleValidationContext
): void {
  if (!names.has(name)) return;
  addPathDiagnostic(
    RuleDiagnosticCode.DuplicateInputName,
    `Duplicate input name: ${name}.`,
    path,
    ruleId,
    context
  );
}

function validateInputNode(
  nodeId: string,
  path: string,
  ruleId: string,
  context: RuleValidationContext
): void {
  if (context.nodes.has(nodeId)) return;
  addPathDiagnostic(
    RuleDiagnosticCode.UnknownNode,
    `Unknown input node: ${nodeId}.`,
    path,
    ruleId,
    context
  );
}

function validateOutput(
  definition: UiDerivedRuleDefinition,
  index: number,
  context: RuleValidationContext
): void {
  const path = `/rules/${index}/output`;
  const node = context.nodes.get(definition.output.nodeId);
  if (node === undefined) return addUnknownOutputNode(definition, path, context);
  validateControlOutput(definition, node.kind, path, context);
  validatePropertyOutput(definition, path, context);
}

function addUnknownOutputNode(
  definition: UiDerivedRuleDefinition,
  path: string,
  context: RuleValidationContext
): void {
  const id = definition.output.nodeId;
  addPathDiagnostic(
    RuleDiagnosticCode.UnknownNode,
    `Unknown output node: ${id}.`,
    path,
    definition.id,
    context
  );
}

function validateControlOutput(
  definition: UiDerivedRuleDefinition,
  kind: UiNodeKind,
  path: string,
  context: RuleValidationContext
): void {
  if (!isControlOutput(definition.output.kind)) return;
  if (kind === UiNodeKind.Control) return;
  addPathDiagnostic(
    RuleDiagnosticCode.InvalidOutput,
    "Control outputs require a control node.",
    path,
    definition.id,
    context
  );
}

function validatePropertyOutput(
  definition: UiDerivedRuleDefinition,
  path: string,
  context: RuleValidationContext
): void {
  const output = definition.output;
  if (output.kind !== UiDerivedRuleOutputKind.NodePatchProperty) return;
  if (IDENTIFIER.test(output.property)) return;
  addPathDiagnostic(
    RuleDiagnosticCode.InvalidOutput,
    "Invalid output property.",
    path,
    definition.id,
    context
  );
}

function isControlOutput(kind: UiDerivedRuleOutputKind): boolean {
  return (
    kind === UiDerivedRuleOutputKind.ControlSetDisabled ||
    kind === UiDerivedRuleOutputKind.ControlSetValue
  );
}

function addUnusedInputDiagnostics(
  definition: UiDerivedRuleDefinition,
  referenced: readonly string[],
  index: number,
  context: RuleValidationContext
): void {
  const used = new Set(referenced);
  definition.inputs.forEach((input, inputIndex) =>
    addUnusedInput(input.name, inputIndex, definition.id, index, used, context)
  );
}

function addUnusedInput(
  name: string,
  inputIndex: number,
  ruleId: string,
  ruleIndex: number,
  used: ReadonlySet<string>,
  context: RuleValidationContext
): void {
  if (used.has(name)) return;
  addPathDiagnostic(
    RuleDiagnosticCode.UnusedInput,
    `Declared input is unused: ${name}.`,
    `/rules/${ruleIndex}/inputs/${inputIndex}`,
    ruleId,
    context
  );
}

function createSeed(
  definition: UiDerivedRuleDefinition,
  referencedInputs: readonly string[]
): RuleGraphSeed {
  return {
    definition,
    inputs: definition.inputs.map(inputDependency),
    outputs: outputDependencies(definition.output),
    primaryOutput: primaryOutputDependency(definition.output),
    referencedInputs
  };
}

function addRuleDiagnostic(
  code: RuleDiagnosticCode,
  message: string,
  index: number,
  ruleId: string,
  context: RuleValidationContext
): void {
  addPathDiagnostic(code, message, `/rules/${index}`, ruleId, context);
}

function addPathDiagnostic(
  code: RuleDiagnosticCode,
  message: string,
  path: string,
  ruleId: string,
  context: RuleValidationContext
): void {
  context.diagnostics.push({ code, message, path, ruleId });
}

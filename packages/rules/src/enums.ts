export enum JsonLogicOperator {
  Add = "+",
  And = "and",
  Boolean = "!!",
  Cat = "cat",
  Divide = "/",
  Equal = "==",
  GreaterThan = ">",
  GreaterThanOrEqual = ">=",
  If = "if",
  In = "in",
  Length = "length",
  LessThan = "<",
  LessThanOrEqual = "<=",
  Max = "max",
  Merge = "merge",
  Min = "min",
  Modulo = "%",
  Multiply = "*",
  Not = "!",
  NotEqual = "!=",
  Or = "or",
  StrictEqual = "===",
  StrictNotEqual = "!==",
  Substr = "substr",
  Subtract = "-",
  Ternary = "?:",
  Variable = "var"
}

export enum RuleCompilationStatus {
  Invalid = "invalid",
  Valid = "valid"
}

export enum RuleDiagnosticCode {
  BudgetExceeded = "budget-exceeded",
  Cycle = "cycle",
  DuplicateInputName = "duplicate-input-name",
  DuplicateRuleId = "duplicate-rule-id",
  InvalidExpression = "invalid-expression",
  InvalidInput = "invalid-input",
  InvalidOutput = "invalid-output",
  InvalidRule = "invalid-rule",
  MultipleWriters = "multiple-writers",
  UndeclaredInput = "undeclared-input",
  UnknownNode = "unknown-node",
  UnknownOperator = "unknown-operator",
  UnusedInput = "unused-input"
}

export enum RuleEvaluationStatus {
  Applied = "applied",
  BudgetExceeded = "budget-exceeded",
  Failed = "failed"
}

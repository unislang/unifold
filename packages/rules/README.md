# `@unislang/unifold-rules`

Compiles declared, pure JSON Logic expressions into a dependency DAG and evaluates only rules
reachable from changed node-state paths. Rule results become a narrow set of typed Unifold state
commands; effects, arbitrary JavaScript, asynchronous operators, and undeclared reads are excluded.

The package uses `json-logic-engine` for expression semantics. Unifold owns only the safety profile,
dependency analysis, scheduling, budgets, and typed-command adapter required by its architecture.

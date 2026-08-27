# @unislang/unifold-xstate

Thin integration with XState v5. The package does not implement a state-machine
runtime, scheduler, retry engine, or cancellation system.

- `XStateEventRouter` maps a canonical event to explicitly registered owning
  actors without broadcasting to every actor and drops all ownership for structurally removed
  nodes.
- `createCommandAction` adapts a named XState action to Unifold's command sink.
- `createEffectActorLogic` uses XState's `fromPromise` and its abort signal to
  invoke a registered capability.
- `createUiMachineActor` compiles the validated flat machine profile to XState v5.
- `UiMachineCommandRegistry` maps portable command IDs to trusted typed command factories.
- `UiMachineGuardRegistry` maps portable guard IDs to bounded synchronous predicates over canonical
  events and read-only normalized snapshots. Predicate failures deny the transition.

The application coordinator registers batched portable transition commands under
`UiXStateImplementationName.EmitCommands`, so every transition reaches the runtime in one atomic
transaction. Hosts can register `createCommandAction` directly when adapting a single trusted
command sink outside the document-driven coordinator.
Register guard predicates through `createMachineGuardRegistry()` and reference only their names in
portable transitions. Effects remain named capabilities; portable JSON never embeds executable code.

The application coordinator attaches each actor to its declared owner scope, retains unchanged
actors during document reconciliation, and sends commands back through the normal runtime with
correlation and causation metadata. See [JSON workflows](../../docs/workflows.md).

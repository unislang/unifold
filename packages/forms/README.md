# `@unislang/unifold-forms`

Stateless validation adapters for the authoritative Unifold control graph. The package never owns
form values or a parallel store. Runtime transactions call registered synchronous validators and
commit value, status, errors, touched state, and ancestor aggregates atomically.

Standard Schema validators from Zod, Valibot, ArkType, and compatible libraries can be registered
through `createStandardSchemaValidator`. Promise-returning schemas stay out of that synchronous
adapter and can instead be registered through `UiAsyncValidatorRegistry`.

Controls declare `validators`, `asyncValidators`, and an enum-backed `updateOn` trigger: `Input`,
`Blur`, or `Submit`.
The runtime keeps `rawValue` for tentative input, commits `value` at the configured trigger, and
validates the same transaction. Form submission marks descendants touched, commits submit-deferred
values, aggregates status and errors, and publishes either `UiEventType.FormInvalid` or
`UiEventType.FormSubmitted` through the canonical stream.

The built-in `required` validator and default English message are the initial reference
implementation. Applications can register stateless validators and inject a message formatter.
Aggregate nodes can also declare validator IDs. The runtime derives the aggregate first, validates
that authoritative value in the same transaction, and then derives its ancestors. A Standard Schema
issue path can map to stable affected node IDs while the aggregate retains ownership of the error.
The reference application demonstrates this with Valibot's object-level `check` and `forward` APIs.
Form reset is an explicit command and canonical result: it restores committed and tentative values,
pristine/dirty and touched flags, validation, and aggregates in one revision. Disabled controls are
excluded from committed form values, errors, and status while remaining available through aggregate
`rawValue`; enabling a control revalidates it immediately. Async rules run as cancellable XState
promise actors. Each run stores an authoritative request ID on the control, publishes enum-backed
started/completed/cancelled/failed lifecycle facts, and commits only while that request is current.
A new applicable value aborts the prior actor; synchronous failures skip async work.

Validator results are normalized with their authoritative owner ID. The runtime derives
`affectedIds` routes transactionally, allowing aggregate-owned issues to invalidate and project on
unchanged target controls without copying errors into those controls.
Ordinary leaf transactions recompute and validate only the affected aggregate ancestry. Submit,
reset, and structural operations intentionally retain their broader transactional scope.

Declarative cross-field dependency scheduling, localization catalogs, and configurable submit
serialization remain planned.

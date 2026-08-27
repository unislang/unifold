# Authored collection lifecycle research

Audience: Unifold contracts, compiler, runtime, renderer, and application maintainers
Date: 2026-08-27
Decision: expose compiler-authorized collection IDs and durable keys; use RFC 6902 internally on a
cloned authored document; then commit through the existing compile/reconcile transaction.

## Scope and assumptions

This report evaluates the safest and least duplicative way to insert, move, and remove repeated
hierarchical JSON UI items while retaining one authored/runtime/DOM authority. It assumes the
current TypeScript, Lit, XState 5, Web Component, and JSON UI profile boundaries. Server persistence,
offline merge, and multi-writer collaboration are excluded; those require the collaboration and
control-plane protocols rather than a browser collection helper. Markdown is the canonical
repository deliverable, so no separate PDF or office-document copy is generated.

## Executive answer

A repeated layout node may declare a unique `collection` name and durable item key. Compilation
retains the corresponding source pointer and key property as private authority. Callers mutate by
collection ID, optimistic expected/new revision, durable key or insertion index, and inserted data.
The application resolves the current key to an array index, applies a bounded RFC 6902 operation to
a clone, recompiles the entire candidate, and commits through the existing structural reconcile.
The public event carries only operation type, collection ID, and affected indexes.

This boundary is safer than public JSON Pointer or arbitrary JSON Patch. [RFC 6901](https://www.rfc-editor.org/info/rfc6901/)
addresses array members by zero-based position, so a stored pointer does not provide durable item
identity after earlier insertions or removals. [RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902)
already standardizes ordered add, remove, and move operations and their failure behavior, making a
maintained implementation preferable to another patch engine. Unifold therefore translates a
domain operation into JSON Patch only after compiler authorization and key resolution.

## Architecture and efficiency analysis

The design preserves the authored document as the source of structural truth. Runtime collection
commands remain useful headless primitives, but the packaged application API never edits only the
normalized graph: a successful operation changes authored JSON, compiled IR, XState/runtime facts,
and rendered elements across the same existing update boundary. A rejected patch or failed compile
leaves the last known good authored document and mounted application intact.

Stable keys are required at authoring time and checked again at mutation time. The official
[Lit `repeat` contract](https://lit.dev/docs/api/directives/) explains why: unique keys maintain a
strict key-to-DOM mapping, move existing DOM for an item, and minimize unnecessary insertion and
removal work. Unifold's renderer uses the compiled durable node ID for the same identity guarantee,
which lets edited value and focus survive insertion and reordering of unaffected controls.

The approach also matches the upstream [JsonUI model](https://www.jsonui.org/), where component
trees, store bindings, validation, and event behavior are runtime data while state remains separate
from the model. Unifold accepts that hierarchical authoring premise but deliberately routes every
candidate through its own compiler, normalized store, event fabric, and XState authority. It does
not introduce a competing list store or reuse JsonUI's React runtime.

XState actors process events sequentially and encapsulate their internal state, as documented by
the official [XState actor model](https://stately.ai/docs/actors). Collection changes consequently
enter the same command and transaction flow as other UI changes. Operation metadata is audit-only;
it does not contain inserted values or durable keys, avoiding a new disclosure path in the unified
event stream.

## Alternatives considered

- Public runtime insert/move/remove commands were rejected because authored JSON and a later export
  would diverge from the mounted graph.
- Public JSON Pointer plus key-property declarations were rejected because callers could name
  unauthorized locations and because array pointers are positional rather than durable identities.
- Public arbitrary JSON Patch was rejected because its larger operation and path surface bypasses
  collection-specific admission, identity, revision, and privacy policy.
- A second form/list observable or component-local collection store was rejected because it would
  compete with the normalized graph and XState authority.
- A custom patch implementation was rejected because `rfc6902@5.3.0` already provides the required
  standards implementation under the MIT license.

## Positive, negative, and boundary evidence

Focused tests cover compiler-authorized collections, unique names and durable keys, optimistic
revision rejection, unknown collections, duplicate keys, invalid indexes, invalid candidates, and
mounted insert/move/remove behavior. They also prove retained edited value, element identity, focus,
privacy-bounded structural metadata, and last-known-good recovery.

The final negative-case audit also rejects unknown operation discriminators, inherited registry
names, unsafe numeric identities, duplicate names for one authored-array authority, and synchronous
structural reentry. The raw pointer helper is internal to the package; the public root exposes only
the enum-backed operation types and application method. Named repeats now target one explicit
logical Array or Record authority, whose generated member controls preserve aggregate value/order.
The mounted runtime and renderer are restricted capability facades: all six raw structural command
families remain on the headless runtime but cannot bypass authored coordination after mounting.
Trusted host correlation and causation IDs can accompany a collection operation without admitting
authored or caller-selected transaction identity.

The Chromium reference journey exercises the packaged public API against real Web Components. It
inserts, reorders, and removes authored items; preserves an unaffected dirty control and its DOM
identity/focus; verifies command-to-transaction causality; rejects an invalid candidate; and proves
that a non-cooperative validator for the removed control cannot publish late events. The complete
reference matrix passes 61/61. Playwright's official
[auto-retrying assertions](https://playwright.dev/docs/test-assertions) are used for observable DOM
state; the explicit timeout exists only to cross the intentionally delayed validator boundary.

## Remaining feasibility gaps

- Removing the item that owns focus now selects the next surviving member at the same index, then
  the previous member. The canonical focus effect runs only after renderer, workflow, and semantic
  commit, retains trusted lineage, traverses nested layout hosts, and is proven in Chromium/WebKit.
  Empty collections deliberately do not make inert layout content focusable; an authored fallback
  reference and compiler validation remain open.
- Renderer or semantic-projection failure can follow publication of the forward structural event.
  Compensation restores state, but external consumers do not yet receive one buffered atomic event
  or an explicit causally linked compensation contract.
- Full candidate compilation favors correctness and a single authority. Initial and revision
  compilation now have 500-item gates; 1,000-item, allocation, end-to-end mutation, and selective
  projection measurements remain before an incremental compiler path could be justified.
- Distributed revisions, server persistence, concurrent writers, and offline merge remain outside
  this API and must use the existing collaboration/control-plane boundaries.

These gaps do not invalidate the bounded lifecycle, but they keep the broader dynamic logical-form
collection acceptance criterion partial.

## Recommendations

1. Specify and validate an authored empty-collection focus fallback before enabling singleton
   removal in production authoring tools.
2. Buffer structural event publication until renderer and semantic commit, or add an explicit
   causal compensation event that external consumers can reconcile safely.
3. Add 1,000-member and end-to-end mutation browser/performance gates before optimizing compilation. Retain the
   full-recompile path as the correctness oracle for any incremental implementation.
4. Keep source pointers and key-property bindings private and retain the enum-backed, named public
   collection operation contract.

## Claim-to-source ledger

- “RFC 6901: JavaScript Object Notation (JSON) Pointer,” IETF/RFC Editor, April 2013, accessed
  2026-08-27: https://www.rfc-editor.org/info/rfc6901/
- “RFC 6902: JavaScript Object Notation (JSON) Patch,” IETF, April 2013, accessed 2026-08-27:
  https://datatracker.ietf.org/doc/html/rfc6902
- “Directives – repeat,” Lit, accessed 2026-08-27: https://lit.dev/docs/api/directives/
- “JsonUI,” JsonUI project, accessed 2026-08-27: https://www.jsonui.org/
- “Actors,” Stately/XState, accessed 2026-08-27: https://stately.ai/docs/actors
- “Assertions,” Playwright, accessed 2026-08-27:
  https://playwright.dev/docs/test-assertions
- “chbrown/rfc6902,” Christopher Brown, accessed 2026-08-27:
  https://github.com/chbrown/rfc6902

Research stopped after primary standards, official framework/testing documentation, upstream
project documentation, installed package metadata, focused source inspection, and executable tests
converged on the same boundary. Additional general web results would not change the implementation
decision without new distributed-collaboration requirements.

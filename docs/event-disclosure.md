# Runtime event disclosure

Unifold exposes one public-safe runtime event view through `runtime.events$` and the node, scope,
type, composition, and XState indexes derived from it. These views receive the same immutable event
object. Disclosure changes an event payload, not its identity, ordering, causality, or routing.

The normalized runtime remains the authority for complete application state. Code that is authorized
to inspect a value reads it deliberately through a runtime snapshot or selector; it must not depend
on a value being copied into a canonical event.

## Classification policy

The ordered classifications are `public`, `internal`, `confidential`, `restricted`, and
`never-export`, from least to most restrictive. Runtime event disclosure follows this matrix:

| Effective classification | Runtime event disclosure                                       |
| ------------------------ | -------------------------------------------------------------- |
| `public`                 | Ordinary events may include their complete change and snapshot |
| `internal`               | Metadata only                                                  |
| `confidential`           | Metadata only                                                  |
| `restricted`             | Metadata only                                                  |
| `never-export`           | Metadata only                                                  |

The four non-public classifications intentionally have the same public-stream representation. Their
different names express host policy for deliberate snapshot access, persistence, telemetry, support,
and other sinks that are outside the event fabric. `never-export` is the strongest instruction: its
value remains available only where the live application must render or process it. Classification
does not encrypt data, authenticate a subscriber, or prevent trusted same-realm code from inspecting
rendered controls.

Each classification-bearing runtime fact states whether its disclosure is full or metadata-only,
records the effective classification and snapshot revision, and, when metadata-only, identifies
whether classification or the `store.write` rule caused the projection. A metadata-only fact keeps:

- CloudEvents identity and type;
- phase, correlation, causation, transaction, sequence, time, and state revision;
- runtime context;
- source-node identity: stable ID, instance ID, kind, parent ID, scope path, component type, and
  definition version; and
- an event-specific allowlist such as command type, request ID, reason, error count, changed node
  IDs, or changed state paths.

It omits the node snapshot and value-bearing change data. Validation parameters, form values, raw
exception text, and arbitrary effect input are not metadata. Exception facts use stable, sanitized
failure information regardless of source classification.

## Effective classification

Disclosure uses the most restrictive classification of every value represented by a fact:

- a node intent, command, validation fact, or effect uses its authoritative runtime node;
- a transaction uses the maximum classification among its changed nodes before and after commit, so
  removal or replacement cannot erase the policy that governed the previous value;
- a form submit, reset, or invalid result uses the maximum classification of the entire form scope,
  because its aggregate value and issues can represent descendants; and
- a derived `store.write` command and its requested, completed, or failed effect facts are always
  metadata-only, including for a public store.

## DOM intent boundary

The bubbling, composed `unifold-event` dispatched by a Web Component is trusted transient ingress
inside the mounted application. It carries the current interaction value so the coordinator can
derive a typed command. It is not the public-safe subscription or telemetry surface.

The runtime validates and accepts that intent, publishes a classification-aware projection to
`runtime.events$`, and returns the complete accepted intent to the coordinator that derives the
command. The projection uses the authoritative runtime snapshot classification rather than any
classification claimed by incoming event data. Same-origin code that is not trusted with live UI
values must not be given access to the application DOM.

If a host needs a DOM-level public event, it must dispatch a separate redacted fact. Relabeling the
transient ingress event as public-safe would be incorrect because the current command bridge needs
its value.

## Consumer rules

- Use `runtime.events$` or an indexed runtime view for logging, workflow routing, and public event
  integration.
- Use runtime selectors for deliberate, in-process value access.
- Do not forward the transient DOM intent event to telemetry, persistence, AI context, test
  artifacts, or another trust boundary.
- Apply an independent authorization and redaction policy before forwarding even public-safe event
  metadata outside the application. Stable IDs and scope paths are intentionally retained for
  routing, but a host may classify their naming conventions more strictly.
- Treat screenshots, DOM capture, runtime snapshots, and traces as separate value-bearing artifacts;
  event redaction does not sanitize them.

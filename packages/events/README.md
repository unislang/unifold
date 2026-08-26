# @unislang/unifold-events

Canonical, framework-neutral contracts shared by every Unifold runtime.

The package defines the CloudEvents-compatible `UiEvent` envelope, normalized
node snapshots, named wire enums, commands, and transaction records. It has no
DOM, RxJS, XState, renderer, or application-state dependency.

```ts
import { createUiEvent, UiEventPhase, UiEventType } from "@unislang/unifold-events";

const event = createUiEvent({
  id: "event-1",
  source: "urn:unifold:runtime:example",
  type: UiEventType.TransactionCommitted,
  time: new Date().toISOString(),
  correlationid: "correlation-1",
  transactionid: "transaction-1",
  sequence: 1,
  staterevision: 1,
  data: {
    phase: UiEventPhase.State,
    runtime: { documentId: "example" }
  }
});
```

Application runtimes create envelopes. Components emit intent data and never
construct trusted transaction metadata themselves.

Classification-bearing runtime event data records whether disclosure is full or metadata-only and
the effective `DataClassification`. Public ordinary facts may include their complete snapshot and
change. Internal, confidential, restricted, and never-export facts preserve source identity,
routing, causality, and an event-specific metadata allowlist while omitting snapshots and
value-bearing changes. Exception text is sanitized independently of classification. The runtime,
rather than `createUiEvent()`, resolves aggregate and transaction classification from authoritative
state.

`StoreWriteCommand` is a typed post-commit effect carrying a node ID, declared store ID, JSON Pointer
path, and JSON value. Runtime telemetry identifies `store.write` and its source-node identity without
copying the value or bound control snapshot into derived command/effect facts; the trusted adapter
port still receives the complete command.

The component-level DOM `unifold-event` is trusted transient ingress and may contain the current
interaction value. `runtime.events$` and its indexed views are the public-safe event surface. See
[runtime event disclosure](../../docs/event-disclosure.md).

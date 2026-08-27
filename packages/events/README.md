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

Every admitted post-commit effect receives one opaque operation identity. The effect command fact
uses its own event ID as the CloudEvents `subject`; `EffectRequested` and exactly one normal
`EffectCompleted` or `EffectFailed` terminal fact reuse that subject while retaining distinct event
IDs. Effect data identifies only the command type and optional target ID and declares
`UiEventDataSchema.EffectV1`. The packaged
`./schemas/effect-event-data.schema.json` contract rejects arbitrary provider, DOM, value, or error
fields.

Effect lifecycle facts use the closed
`https://schemas.unifold.org/events/effect-data/1.0/schema.json` payload contract. The command fact,
`effect.requested.v1`, and exactly one settlement fact share one opaque `subject`; the command fact's
event ID is that subject. Each lifecycle event still receives its own event ID. Public change data is
limited to the registered `commandType` and optional target node ID, while the authoritative port
receives the complete typed command and the same `effectId` in its execution context. This derived
identity is runtime metadata and never appears in authored layout JSON.

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

# Stores and control bindings

Unifold documents may declare typed external stores and bind value-bearing controls to schema-known
JSON Pointer paths. The normalized node graph remains the authority for committed UI state. Store
adapters are trusted ingress and effect ports: they provide initial domain data before mount and
receive changed committed values after a runtime transaction.

This is a Unifold extension to the pinned JsonUI profile. It reuses the familiar `store` and `path`
field names but does not install JsonUI's store, modifier, action, error, or touched-state runtime.

## Authoring contract

The document-level `stores` array contains versioned `UiStoreDefinition` values. A control binds to
one declaration by putting both `store` and `path` on its JsonUI-shaped node:

```json
{
  "stores": [
    {
      "schemaVersion": "1.0.0",
      "id": "customer",
      "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string" }
        },
        "required": ["name"]
      },
      "source": { "kind": "host" },
      "access": "read-write-draft",
      "ownership": "host",
      "persistence": "session",
      "classification": "internal",
      "initialData": "required",
      "maxBytes": 65536,
      "migrations": {
        "minimum": "2.0.0",
        "maximum": "2.9.0"
      }
    }
  ],
  "view": {
    "$comp": "TextField",
    "id": "name",
    "label": "Name",
    "store": "customer",
    "path": "/name"
  }
}
```

`store` and `path` are an inseparable pair. `path` uses RFC 6901 JSON Pointer syntax, including the
empty string for the whole store value. A binding is valid only when all of these conditions hold:

- the store ID is declared exactly once;
- the embedded schema is valid JSON Schema Draft 2020-12 and contains no remote `$ref`;
- the pointer resolves inside that schema;
- the component has a catalog-declared `value` property; and
- the path schema matches the value type: string, boolean, or array of strings in the current core
  catalog.

The compiler accepts at most 32 stores. `maxBytes` must be between 1 byte and 10 MiB. Query sources
are constrained to `read-only` access, `remote-query` ownership, and `remote` persistence. Other
source, ownership, and persistence combinations are descriptive policy in this slice; they do not
instantiate browser storage or network clients.

## Store policy fields

| Field            | Current behavior                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `source.kind`    | Declares `host`, `local`, `query`, or `route`; selects no adapter automatically                    |
| `access`         | `read-only` disables and makes bound controls readonly; `read-write-draft` enables write effects   |
| `ownership`      | Records `host`, `remote-query`, or `runtime` ownership intent                                      |
| `persistence`    | Records `memory`, `session`, `local`, or `remote` persistence intent                               |
| `classification` | Projects `public`, `internal`, `confidential`, `restricted`, or `never-export` onto node snapshots |
| `initialData`    | Requires, permits, or forbids a value returned by the adapter at preparation time                  |
| `maxBytes`       | Bounds the UTF-8 JSON encoding of adapter-provided initial data                                    |
| `migrations`     | Defines the inclusive adapter-version range accepted by this document                              |

The synchronous mount seam compares the adapter's semantic version with the declared minimum and
maximum. The opt-in asynchronous seam additionally executes only host-registered exact migration
edges. It rejects missing or duplicate edges, cycles, exceptions, invalid identities, and chains
over sixteen steps. Every migration receives and returns defensive JSON copies. The complete
migrated candidate and target data version cross the adapter boundary on commit, so persistence
never applies a new-schema path to an old-schema value.

Classification is metadata, not encryption or authorization. The semantic JSON-LD compiler requires
public data, and portable document export contains store definitions rather than loaded adapter
values. The public-safe runtime stream includes complete ordinary snapshots only for public data.
Internal, confidential, restricted, and never-export values produce metadata-only facts that retain
source identity and causality without snapshots or value-bearing changes. See
[runtime event disclosure](./event-disclosure.md).

## Adapter lifecycle

Applications pass a `UiStoreAdapterRegistry` to `mountUnifoldApplication()`:

```ts
const result = mountUnifoldApplication(document, host, {
  storeAdapters: {
    customer: {
      version: "2.1.0",
      load: () => ({ name: "Ada" }),
      write: (path, value) => saveCustomerDraft(path, value)
    }
  }
});
```

Every declared store currently requires an adapter, even when initial data is optional or forbidden.
Before DOM mount, Unifold synchronously loads each adapter, validates its version, initial-data
policy, byte quota, and complete value against the embedded schema, and verifies that writable stores
have a `write` method. Any failure rejects mount without a partial application. Optional missing data
preserves the component's authored default.

Loaded values are cloned and projected into bound node snapshots. The adapter is not itself an RxJS
store and components never call it. A control intent first commits through the normal Unifold
transaction, validation, aggregate, event, and selective-rendering path. If its committed value
changed, the runtime derives a typed `store.write` effect and calls the adapter with the declared
pointer. Read-only stores never receive writes. Derived store command/effect facts retain the
component's non-value source identity but always omit the bound snapshot and write value, even for a
public store. The preceding intent, committed command, transaction, validation, and form facts use
the classification-aware runtime disclosure policy. A transaction considers changed nodes before
and after commit, while a form result considers its complete scope.

Store writes are post-commit effects. A thrown `write` produces the normal effect-failed fact but
does not roll back the already committed UI transaction. Production adapters that require atomic
domain persistence need a server command/outbox workflow rather than treating this synchronous draft
port as a distributed transaction.

`createMemoryStoreAdapter()` is a deterministic helper for tests and local prototypes.
`createWebStorageStoreAdapter(storage, key, version)` is the second replaceable adapter. The host
injects `localStorage`, `sessionStorage`, or a compatible port; Unifold does not read browser globals.
It persists a versioned JSON envelope and applies the same safe JSON Pointer writer.

## Asynchronous and external adapter contract

`connectAsyncStore()` is an opt-in parallel lifecycle; it does not change the synchronous mount API.
The host supplies an adapter plus a fail-closed authorization port and may supply trusted migration
edges, cancellation, and an explicit concurrent-external-update policy. Connection authorizes
`load` and, only when implemented, `subscribe`. Every commit separately authorizes the exact store,
classification, and JSON Pointer path before deriving and schema-validating a complete candidate.

Snapshots carry independent `dataVersion` and opaque `revision` identities. Commits require the
current revision and a bounded idempotency key. The adapter receives the complete validated
candidate and target version, and must return a different revision. Provider exceptions, malformed
statuses, invalid snapshots, cancellation, local overlap, and revision conflicts become closed,
value-free results. Subscriptions are validated before session state changes. The default policy
retains the current snapshot and reports a concurrent external conflict; `external-wins` queues one
update until the local commit settles. An echoed snapshot matching the accepted local revision is
suppressed.

`createAsyncMemoryStoreAdapter()` provides bounded idempotency replay and deterministic optimistic
concurrency for tests and prototypes. `createAsyncKeyValueStoreAdapter()` is an independent
implementation over an injected asynchronous port. Its port owns atomic compare-and-set and
idempotency semantics; the adapter enforces bounded versioned UTF-8 JSON envelopes and contains
corrupt external notifications. One conformance suite runs the same load, commit, replay, stale
revision, subscription, and disposal cases against both implementations.

## Current limitations and next evidence

The remaining seam limitations are:

- query execution, caching, retry, offline orchestration, automatic connector selection, or remote
  connectors;
- merge/CRDT semantics or multi-writer arbitration beyond explicit reject/external-wins policy;
- automatic projection of async session updates into a mounted application's normalized runtime;
- browser lifecycle evidence for async connection, cancellation, external update, and disposal;
- atomic rollback across the normalized transaction and an external adapter write.

The replacement boundary has unit evidence for memory and injected Web Storage adapters and browser
evidence for hydration, write-through, dynamic path replacement, selective sibling identity, and
missing/invalid adapter rejection before rendering.

Avoid binding multiple writable controls to the same store path until conflict semantics are defined.
Async sessions expose validated external changes but application mount integration is still a
release gate; external changes for a mounted application still require a coordinated document
update, remount, or application-level command through normal runtime ingress. Future integration
must retain schema validation,
single-transaction UI commits, canonical event causality, and the rule that components never own a
parallel application store.

The implementation reuses `json-schema-library` for Draft 2020-12 compilation and schema-pointer
resolution, `@sagold/json-pointer` for RFC 6901 value access, and `semver` for adapter range checks.
See the [OSS decision register](./oss-decisions.md) for ownership and replacement boundaries.

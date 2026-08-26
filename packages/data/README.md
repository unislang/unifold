# `@unislang/unifold-data`

Framework-neutral remote query and mutation contracts for Unifold. The package owns safe request and
result envelopes, a bounded TanStack Query Core cache, tag invalidation, last-known-good reads,
supersession/cancellation, bounded retry, optimistic rollback hooks, and cross-context invalidation.

Operations are registered by trusted host code. A JSON UI can select only a registered operation ID;
it cannot provide a URL, credentials, trusted identity, or authorization context. Adapters receive an
`AbortSignal` and must return the safe result union instead of exposing raw provider exceptions.

```ts
import {
  DataActorCoordinator,
  DataOperationKind,
  DataProtocolVersion,
  DataSourceRegistry
} from "@unislang/unifold-data";

const registry = new DataSourceRegistry();
registry.register("customers.search", async (request, signal) => {
  // A trusted adapter injects session and tenant context here.
  return searchCustomers(request, signal);
});

const data = new DataActorCoordinator({ registry });
const resolution = await data.execute("customer-results", {
  cache: { freshForMs: 30_000, offline: "last-known-good", retainForMs: 300_000 },
  correlationId: crypto.randomUUID(),
  kind: DataOperationKind.Query,
  operationId: "customers.search",
  protocolVersion: DataProtocolVersion.Version1,
  requestId: crypto.randomUUID(),
  variables: { query: "Ada" }
});
```

Mutation retries require the contract's idempotency key. Conflict, denial, validation, and not-found
results are never retried. Cached data retains its original classification and revision. Persistence
adapters must enforce the same classification, tenant isolation, retention, encryption, and quota
rules; the built-in cache is memory-only.

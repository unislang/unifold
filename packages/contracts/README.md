# `@unislang/unifold-contracts`

Versioned, JSON-safe public contracts for Unifold. This first vertical slice
defines the minimal `UiDocument` accepted by the IR compiler and publishes its
JSON Schema 2020-12 document.

The package also publishes a detached Ed25519 envelope contract and executable JSON Schema at
`@unislang/unifold-contracts/schemas/signed-ui-document-envelope.schema.json`. Its payload remains an
exact JSON string so a loader can verify reviewed bytes before parsing or migration.

The initial `UiMachineDefinition` contract describes versioned flat workflow states, canonical
event transitions, stable owners, and registered command IDs. It intentionally contains no
executable actions, guards, or expressions.

`UiStoreDefinition` declares enum-backed source, access, ownership, persistence, classification,
initial-data, version-range, quota, and embedded Draft 2020-12 schema policy. Value-bearing nodes
may pair `store` with an RFC 6901 `path`; compiler and trusted-adapter behavior is documented in
[Stores and control bindings](../../docs/stores-and-bindings.md).

`SemanticGraph` is the single typed authority for Schema.org graph authoring. Its executable schema
is exported at `@unislang/unifold-contracts/schemas/semantic-graph.schema.json`. The `UiDocument`
schema references that registered schema by `$id`, so validators must load both local package
artifacts and must not resolve the identifier over the network.

## Contract rules

- Wire data is JSON-only; functions, symbols, `undefined`, non-finite numbers,
  class instances, and cyclic objects are invalid.
- Finite public string vocabularies are named string enums. Inline literal
  unions and numeric enums are not public contract shapes.
- Every addressable JsonUI node has a stable, document-unique `id`.
- `jsonUiProfile` is explicit and pinned. Unsupported profile features fail
  compilation instead of acquiring renderer-specific behavior.

## Example

```ts
import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type UiDocument
} from "@unislang/unifold-contracts";

const document: UiDocument = {
  $schema: UiContractSchemaUri.Version1,
  schemaVersion: UiSchemaVersion.Version1,
  id: "sign-in",
  revision: "revision-1",
  jsonUiProfile: {
    name: JsonUiProfileName.Unifold,
    version: JsonUiProfileVersion.Version1,
    upstream: JsonUiUpstreamRevision.Version01025
  },
  catalog: {
    name: CoreCatalogName.UnifoldCore,
    version: CoreCatalogVersion.Version1
  },
  view: {
    $comp: "Form",
    id: "sign-in-form",
    $children: [{ $comp: "Button", id: "submit", label: "Sign in" }]
  }
};
```

Type generation from JSON Schema will replace the temporary colocated type
definitions when the repository generator package is introduced. Until then,
schema/type parity is covered by package tests and review.

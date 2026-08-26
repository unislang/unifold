# Pinned JsonUI profile

Unifold accepts a named subset of the JsonUI authoring syntax through
`@unislang/unifold-jsonui`. The validator is a required compiler dependency; the upstream React
runtime is not. This keeps `$comp` and `$children` portable while preserving the Unifold normalized
store as the only application-state authority.

## Exact profile identity

| Field               | Value                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unifold profile     | `unifold-jsonui@1.0.0`                                                                                                       |
| Upstream repository | [`fodori/jsonui`](https://github.com/fodori/jsonui)                                                                          |
| Upstream commit     | [`5401b3d4900ca3032c108d6db00e8a819f4b28e9`](https://github.com/fodori/jsonui/tree/5401b3d4900ca3032c108d6db00e8a819f4b28e9) |
| Upstream packages   | `@jsonui/core@0.10.25`, `@jsonui/react@0.10.25`                                                                              |
| Upstream license    | [MIT](https://github.com/fodori/jsonui/blob/5401b3d4900ca3032c108d6db00e8a819f4b28e9/LICENSE)                                |

The document schema and TypeScript contract accept only this name, profile version, and commit.
Branch names, placeholders, other commits, and undeclared profile fields fail before IR generation.
The IR records the exact upstream revision for provenance.

## Supported boundary

| JsonUI feature                           | Profile behavior                                                     |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `$comp` component tree                   | Compiled using the Unifold catalog                                   |
| Array-valued `$children`                 | Compiled as ordered child nodes                                      |
| Stable `id`                              | Required Unifold extension on every node                             |
| Declared `store` and `path` pair         | Required Unifold extension for schema-checked value-bearing controls |
| Undeclared shorthand or `$pathModifiers` | Rejected; no upstream store expansion is installed                   |
| Primitive/default-slot children          | Rejected; use catalog text properties or child nodes                 |
| `$child*` named slots                    | Rejected                                                             |
| `$action` event behavior                 | Rejected                                                             |
| `$modifier` and JSONata                  | Rejected                                                             |
| `$validations`                           | Rejected; use registered Unifold validators                          |
| List and pagination directives           | Rejected                                                             |
| Translation directives                   | Rejected                                                             |
| State export callbacks                   | Rejected; use the portable exporter                                  |
| Unknown `$...` directives                | Rejected                                                             |

Upstream describes component/default and named slots, store access, actions, modifiers, JSONata,
validation, and state export in its [official README](https://github.com/fodori/jsonui/blob/5401b3d4900ca3032c108d6db00e8a819f4b28e9/README.md). Its
[`store`/`path` expansion](https://github.com/fodori/jsonui/blob/5401b3d4900ca3032c108d6db00e8a819f4b28e9/packages/core/src/JsonUI/expandSimplifiedNode.ts)
creates upstream get/set/error/touch bindings. Unifold does not adopt that expansion because it would
create a second state and validation authority beside the normalized node graph.

Instead, a document may declare typed `UiStoreDefinition` entries and bind a value-bearing control
with a `store` ID and schema-resolved `path`. The profile accepts the pair only for a declared store;
the IR compiler then enforces store policy, JSON Schema pointer existence, and catalog value-type
compatibility. Runtime values still enter the normalized node snapshot, and changed values leave as
typed post-commit effects through a trusted adapter. This is a Unifold extension, not compatibility
with upstream store semantics. See [stores and control bindings](./stores-and-bindings.md).

Other equivalent behavior is authored with catalog properties, compositions, registered validators,
typed commands, and JSON-defined XState machines. Unsupported syntax receives an enum-backed
diagnostic and exact JSON Pointer; it is never passed through for a renderer to reinterpret.

## Executable compatibility evidence

`JSONUI_COMPATIBILITY_CORPUS` contains at least one case for every declared feature. Tests prove the
supported structural cases pass, each unsupported feature fails with its declared identity, and IR
cannot be produced after profile rejection. The public validator also bounds traversal to 64 levels,
10,000 component nodes, 50,000 traversed objects or arrays, and 100 diagnostics, and rejects cycles
without recursive overflow. Component capacity and defensive traversal capacity are separate so a
valid 10,000-component tree is not rejected merely because it contains child arrays or properties.

The test-only `tests/jsonui-parity` workspace also executes the exact published
`@jsonui/react@0.10.25` artifact in Chromium, Firefox, and WebKit. For compatible corpus cases it
compares upstream component traversal, static properties, ordered children, visible output, and the
Unifold IR normalization. It renders the published quick example through upstream and proves that
Unifold rejects its unsupported identity, primitive-child, and store-binding syntax before mounting.
The gate verifies npm tarball integrity, package license and `gitHead`, schema-pin agreement, and the
fixture SHA-256 before browser execution. React and the upstream runtime remain isolated from every
published Unifold package.

Store-binding conformance currently comes from contract, profile, IR, runtime, and application-mount
unit tests. The structural upstream parity runner does not claim binding or event parity: upstream
and Unifold deliberately use different store authorities. Browser E2E coverage for the Unifold
adapter lifecycle remains open.

Action detection follows the pinned upstream event-property grammar rather than scanning arbitrary
application data. Modifier detection follows recursively resolved property values. This prevents an
application data object that merely contains an `$action` key from being misclassified as executable
behavior.

## Compatibility and migration policy

Any expanded syntax support requires a new profile version, corpus additions, document migration,
IR and renderer parity evidence, and proof that state still commits through one Unifold transaction.
An upstream version or commit change requires an explicit reviewed pin update; compatible-looking
branch movement is not accepted.

The generic migration engine is implemented, but there is no fabricated legacy JsonUI profile.
Future profile migrations are exact trusted version edges and run only after any required signature
has verified the original payload. See [document trust and migrations](./document-trust.md).

The structural parity runner is evidence, not a production adapter. A future optional React adapter
must additionally prove how declared Unifold bindings, validation, and canonical events cross that
boundary without installing the upstream store as application truth.

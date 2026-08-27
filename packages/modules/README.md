# `@unislang/unifold-modules`

Static, versioned `UiModule` resolution for large JSON-authored applications. Hosts construct a
trusted in-memory registry from reviewed local/package sources; documents cannot select a URL,
package, callback, or latest version at runtime.

Each import pins an exact module ID, semantic version, SHA-256 integrity, and local namespace. The
resolver validates every source, rejects duplicate registrations, missing or mismatched imports,
namespace collisions, cycles, unsafe resource names, and graph/resource ceilings. Imported
composition names and nested `$compose` references are namespaced deterministically before the
ordinary composition expander runs.

```ts
import {
  createUiDocumentModule,
  createUiModuleRegistry,
  resolveUiModule,
  uiModuleIntegrity
} from "@unislang/unifold-modules";

const sharedIntegrity = await uiModuleIntegrity(sharedModule);
const registry = await createUiModuleRegistry([
  { module: sharedModule, sourceId: "@app/shared/profile.module.json" },
  { module: rootModule(sharedIntegrity), sourceId: "@app/account/account.module.json" }
]);

if (registry.status !== "ready") throw new Error(registry.diagnostics[0]?.message);
const result = await resolveUiModule(registry.registry, {
  exportName: "application",
  moduleId: "org.example.account",
  version: "1.0.0"
});
```

`createUiDocumentModule()` provides the strict module envelope when an application intentionally
keeps its human-authored Scratch-style document as a separate JSON asset. The resolver also accepts
the existing immutable `layoutRegistry` capability for reviewed external layout definitions. A
module may instead export a strict `layout` resource whose ID matches its definition's local
`layoutType`. Resolution qualifies that identity with the authored import namespace and resource
kind: `profile-page` imported as `shared` is selected by the exact
`shared/layout/profile-page@1.0.0` identity. Module definitions and a host registry are combined into
one bounded immutable snapshot; missing, malformed, ambiguous, or mismatched definitions fail
closed without lookup or network I/O.

A resolved artifact contains the expanded `UiDocument`, its deterministic integrity, the composed
pre-expansion build artifact, the resolved module graph, namespaced opaque resources, and source-map
entries back to reviewed module source IDs/pointers. Re-resolving the same registry is deterministic
and performs no I/O.

Artifact integrity is one canonical SHA-256 over the complete reproducibility payload: composed and
expanded documents, the exact graph, resolved resources, and source map. Any change to module layout
provenance or another artifact member therefore invalidates the lock. Locks created by an older
resolver must be regenerated after adopting this contract.

Lowered layout nodes retain node-level provenance. Template-authored nodes point to the exact local
layout definition or imported `layout` resource value; nodes supplied through a root document
variable point to that document's `/variables/...` value. Host-only registries do not carry module
metadata, so their template nodes point to the root document's exact `layoutType` selector.

Document exports may use either canonical JsonUI or the Scratch-style `layoutType`/`variables`/
nested `type`/`props`/`events` authoring contract. Layout expansion runs before module composition
definitions are attached and expanded, so deployment artifacts remain canonical while reviewed
source retains the higher-level layout vocabulary. `createUiModuleLock()` records the exact entry,
sorted dependency graph, expanded-document integrity, and separately computed IR integrity; locks
can be admitted with `validateUiModuleLock()` and its published Draft 2020-12 schema.

Normalized `collectionBehaviors@1.0.0` survives composed and expanded module artifacts and compiles
to IR `1.1.0`. It is a safe execution projection only. The artifact does not retain the original
layout variables or compiler-private source pointers required to authorize
`applyCollectionOperation()`, so module-authored structural mutation remains unsupported and must
not be inferred from the behavior map.

The first contract exports complete documents, composition definitions, and bounded typed opaque
resources for layouts, machines, rules, schemas, tokens, messages, semantics, and scenarios. Layout
resources are declarative definitions consumed by the built-in trusted layout expander. A product
may interpret every other resource only through its registered compiler; the module resolver never
executes them.

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

A resolved artifact contains the expanded `UiDocument`, its deterministic integrity, the composed
pre-expansion build artifact, the resolved module graph, namespaced opaque resources, and source-map
entries back to reviewed module source IDs/pointers. Re-resolving the same registry is deterministic
and performs no I/O.

Document exports may use either canonical JsonUI or the Scratch-style `layoutType`/`variables`/
nested `type`/`props`/`events` authoring contract. Layout expansion runs before module composition
definitions are attached and expanded, so deployment artifacts remain canonical while reviewed
source retains the higher-level layout vocabulary. `createUiModuleLock()` records the exact entry,
sorted dependency graph, expanded-document integrity, and separately computed IR integrity; locks
can be admitted with `validateUiModuleLock()` and its published Draft 2020-12 schema.

The first contract exports complete documents, composition definitions, and bounded typed opaque
resources for machines, rules, schemas, tokens, messages, semantics, and scenarios. A product may
interpret those resources only through its registered compiler; the module resolver never executes
them.

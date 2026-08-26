# OSS decision register

Unifold adopts maintained OSS at implementation boundaries and keeps its public contracts provider
neutral. Each accepted dependency records why it is used, what Unifold still owns, its operational
behavior, and how it can be replaced. Package versions remain exact in the workspace lockfile.

## Control-plane protocol and infrastructure boundary

| Field                 | Decision                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Status                | Accepted protocol/service seam with provider-neutral production adapter mappings              |
| Runtime dependency    | `canonicalize@4.0.0`, Apache-2.0, for RFC 8785 request and backup fingerprinting              |
| Evaluated adapters    | OpenFGA JavaScript SDK for object authorization; OpenTelemetry JS API for trace correlation   |
| Bundled adapters      | Memory/SQLite stores plus structural OpenFGA, OpenTelemetry, admission, and recovery adapters |
| Custom ownership      | Unifold request/result protocol, orchestration order, safe errors, redaction, and conformance |
| Network/data behavior | None in the reference adapter; production port implementations declare their own behavior     |
| Isolation decision    | Shared-schema/mandatory-tenant-key reference tier; stronger tiers replace the store port      |
| Owner                 | Control-plane, security, and operations maintainers                                           |
| Review date           | 2026-08-25                                                                                    |
| Fallback              | Disable governed server features while standalone runtime/export remain available             |

RFC 8785 lists the JavaScript `canonicalize` implementation used by Unifold, so request identity
does not rely on a new serializer. The control-plane package does not implement production identity,
authorization storage, transaction management, queues, observability, secrets, or backup systems.
Those are injected ports because deployment requirements differ and mature infrastructure already
exists.

The official OpenFGA SDK exposes relationship checks against an external authorization service.
Unifold now ships a narrow structural adapter compatible with its documented `check()` call rather
than selecting a service URL, store, retry, or credential topology. The official OpenTelemetry JS
API is the intended library instrumentation boundary; Unifold's wrapper accepts its tracer/meter
shape and exports an explicit privacy-safe attribute allowlist while the host supplies the SDK and
exporters. These adapters prove exact Unifold mapping, failure containment, and replaceability
without adding a mandatory runtime client. Production promotion still requires live deployment
configuration, availability and credential evidence, external vault/key custody, scheduled drill
alerts, and explicit acceptance of the chosen database driver.

## Document signatures: Web Crypto Ed25519

| Field                 | Decision                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| Status                | Accepted for detached document-signature generation and verification       |
| Platform API          | W3C Web Crypto `SubtleCrypto.sign()` and `SubtleCrypto.verify()`           |
| Algorithm             | Ed25519                                                                    |
| Runtime dependency    | None                                                                       |
| Network/data behavior | None; hosts resolve approved public keys through their own trusted adapter |
| Owner                 | Contracts, export, and application-ingress maintainers                     |
| Review date           | 2026-08-25                                                                 |
| Fallback              | Reject signed loading when the required platform capability is unavailable |

The platform implementation is reused instead of implementing cryptography or adding a wrapper
dependency. Node 22.13 and later documents Ed25519 as stable, matching the workspace engine. The
signature covers exact UTF-8 payload bytes before JSON parsing or migration. Key custody, rotation,
revocation, authorization, audit, and tenant policy remain host/control-plane responsibilities; a
valid signature is never treated as authority to invoke an effect.

## JsonUI authoring syntax

| Field                 | Decision                                                                       |
| --------------------- | ------------------------------------------------------------------------------ |
| Status                | Accepted profile; upstream runtime isolated to a test-only parity oracle       |
| Upstream              | `fodori/jsonui` commit `5401b3d4900ca3032c108d6db00e8a819f4b28e9`              |
| Package evidence      | `@jsonui/core@0.10.25` and `@jsonui/react@0.10.25`                             |
| Purpose               | Structural authoring compatibility plus an explicit Unifold extension boundary |
| License               | MIT                                                                            |
| Runtime dependency    | None in published packages; exact upstream packages are conformance-only       |
| Network/data behavior | No runtime network, storage, telemetry, or user-data access                    |
| Measured bundle delta | +5.88 kB minified JavaScript and +1.76 kB gzip; no CSS increase                |
| Owner                 | Contracts and compiler maintainers                                             |
| Review date           | 2026-08-25                                                                     |
| Fallback              | Preserve `UiDocument` and compile the named profile directly to Unifold IR     |

The official [JsonUI repository](https://github.com/fodori/jsonui) describes a React web runtime
with component trees, store bindings, actions/modifiers, inline validation, JSONata, and state
export. Unifold reuses that authoring vocabulary but does not install the runtime in published
packages: its upstream store would compete with the normalized Unifold graph. The exact support
matrix and unsupported diagnostics are maintained in the [pinned profile](./jsonui-profile.md).
The isolated parity workspace executes the exact upstream artifacts only as a browser oracle; its
lockfile integrity, source revision, license, schema pin, and copied-fixture hash are release gates.
The familiar `store`/`path` names are accepted only when a document declares a typed Unifold store.
Unifold does not reuse upstream get/set/error/touch expansion, so the normalized graph remains the UI
state authority. The [store binding contract](./stores-and-bindings.md) documents that deliberate
semantic divergence.

The measured delta compares the reference production build immediately before and after mandatory
profile validation: 356.01 kB/106.05 kB gzip became 361.89 kB/107.81 kB gzip. The build remains below
the provisional 180 KiB gzip Phase 1 budget. Future profile features must retain traversal budgets
and measure compiler, browser, and bundle cost rather than assuming validation is free.

## Store schemas, pointers, and adapter versions

| Field                 | Decision                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Status                | Accepted for the typed store-definition and control-binding seam                           |
| Packages              | `json-schema-library@11.6.2`, `@sagold/json-pointer@7.2.1`, `semver@7.8.5`                 |
| Licenses              | `json-schema-library`: MIT; `@sagold/json-pointer`: MIT; `semver`: ISC                     |
| Purpose               | Compile/traverse Draft 2020-12 schemas, access RFC 6901 paths, and test adapter ranges     |
| Custom ownership      | Store policy, catalog type compatibility, lifecycle, commands, events, and adapter ports   |
| Network/data behavior | None; remote schema references are rejected and host adapters define any external behavior |
| Owner                 | Contracts, compiler, runtime, and application-coordinator maintainers                      |
| Review date           | 2026-08-25                                                                                 |
| Fallback              | Replace implementations behind the same JSON, IR, adapter, and diagnostic contracts        |

`json-schema-library` is used because this seam must both validate complete adapter data and resolve
a JSON Pointer to its subschema during compilation. Reimplementing Draft 2020-12 traversal would be
unsafe, while the existing Ajv boundaries do not expose this pointer-resolution contract. The
compiler permits local schema references and rejects remote references, keeping compilation
deterministic and network-free.

`@sagold/json-pointer` supplies RFC 6901 token decoding. Unifold performs the mutation itself so it
can reject prototype-sensitive tokens, sparse array writes, malformed paths, and overlong pointers
before touching host data. `semver` supplies inclusive adapter-range comparison rather than custom
version ordering. All three dependencies are exact in the lockfile and remain behind
provider-neutral public data contracts. Conformance tests must accompany upgrades, particularly for
schema pointer and escaped-token behavior.

The first complete reference build after this seam is 153.93 kB gzip, up 44.95 kB from the prior
108.98 kB record and still below the provisional 180 KiB Phase 1 gate. This is a production-closure
measurement, not an attribution benchmark for one dependency. Before expanding schema-heavy
browser behavior, measure a compiler-only entry and compare schema precompilation or deliberate lazy
loading; do not replace standards-complete validation with an unmeasured custom subset.

The authorization and prototype-safety hardening pass records 155.19 kB gzip, a further 1.26 kB
increase while remaining under that provisional gate.

The classification-aware disclosure, injected Web Storage adapter, and browser store evidence pass
records 156.75 kB gzip, a further 1.56 kB increase while remaining under the same gate.

These libraries do not provide persistence, subscriptions, migrations, encryption, authorization,
conflict resolution, or distributed transactions. The synchronous adapter is a trusted host port,
and its source/persistence declarations are policy metadata until dedicated implementations and
conformance evidence exist.

## Custom Elements Manifest generation

| Field                 | Decision                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| Status                | Accepted for development-time full-catalog manifest generation                    |
| Packages              | `@custom-elements-manifest/analyzer@0.11.0`, `custom-elements-manifest@2.1.0`     |
| Purpose               | Derive Lit element API facts and validate the generated manifest                  |
| Licenses              | Analyzer: MIT; manifest schema package: BSD-3-Clause                              |
| Runtime dependency    | None; generation and drift checks run only in build/test tooling                  |
| Network/data behavior | No runtime network, storage, telemetry, or user-data access                       |
| Owner                 | Catalog and elements maintainers                                                  |
| Review date           | 2026-08-25                                                                        |
| Fallback              | Preserve the sidecar contract and replace the generator behind schema/drift tests |

The official [analyzer documentation](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)
documents TypeScript analysis, framework plugins including Lit, and source annotations for the
manifest surface. Unifold uses the analyzer rather than building another TypeScript/Lit parser and
validates its projected result with the official `custom-elements-manifest` schema package. Ajv is
reused as the existing JSON Schema validator.

The analyzer is exactly pinned because its Lit plugin is not a separately exported public entry
point. An executable test protects that integration and keeps replacement local to the generator.
Generated source facts are joined to reviewed sidecars rather than hand-maintained twice. The
package publishes the complete twenty-eight-element CEM plus joined component definitions; executable
drift tests protect the replaceable generator boundary.

## Framework host compatibility

| Field                 | Decision                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Status                | Accepted as packed-artifact compatibility evidence; not a core runtime abstraction       |
| Host packages         | `react@19.2.8`, `react-dom@19.2.8`, `vue@3.5.41`, `svelte@5.56.10`                       |
| Build integration     | `@sveltejs/vite-plugin-svelte@6.2.4`; React and Vue use their official runtime APIs      |
| Purpose               | Prove properties, custom events, slots, lifecycle disposal, and state-owner neutrality   |
| Runtime dependency    | None in published Unifold packages; exact host versions live in the parity fixture only  |
| Network/data behavior | None beyond dependency installation; the browser matrix runs entirely against local data |
| Owner                 | Runtime, elements, packaging, and developer-experience maintainers                       |
| Review date           | 2026-08-25                                                                               |
| Fallback              | Retain standards-based Custom Elements and replace only the affected compatibility case  |

Unifold does not ship bespoke React, Vue, or Svelte renderers. Each official framework mounts a
thin shell around the same public `@unislang/unifold` facade and the same JSON document. Unifold
remains the sole owner of control and application state; framework rerenders must preserve element
identity, focus, values, event sequencing, and the single runtime mount. The matrix also exercises
object-valued Web Component properties, the dashed `unifold-event`, default slots, and disposal
after framework unmount.

The compatibility workspace exact-pins its host toolchain so failures identify a reviewed surface
change rather than registry drift. Svelte's official Vite plugin is reused instead of implementing
compiler integration. Version `6.2.4` is the current line compatible with the workspace's Vite 7;
the next plugin major requires Vite 8. A framework-specific adapter may be added only when measured
consumer evidence identifies a standards gap that cannot be handled by the host's documented APIs.
The clean-consumer gate installs packed Unifold artifacts outside the monorepo and reruns the matrix,
preventing workspace source resolution from disguising incomplete package contents.

## DataGrid foundation spike

| Field                | Decision                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Status               | Framework-native foundation selected                                                        |
| Compared candidates  | Native HTML; `@spectrum-web-components/table@1.12.2`; current Lion component inventory      |
| Purpose              | Choose accessible sort/selection behavior before implementing the stable DataGrid contract  |
| License              | Spectrum candidate is Apache-2.0                                                            |
| Runtime dependency   | None; Spectrum remains an exact-pinned development-only benchmark dependency                |
| Native measurement   | 45.72 ms p95 over 20 1,000-row samples; 435-byte gzip candidate                             |
| Spectrum observation | 344.44 ms p95 over 3 descriptive 1,000-row samples; 36,856-byte gzip candidate              |
| Owner                | Catalog, elements, accessibility, performance, and export maintainers                       |
| Review date          | 2026-08-25                                                                                  |
| Fallback             | Re-run the bounded candidate spike without changing the public `unifold-data-grid` contract |

The reproducible `pnpm benchmark:data-grid-foundation` spike implements equivalent 1,000-row
native and Spectrum candidates and writes `benchmark-results/data-grid-foundation.json`. The native
gate requires exact row count, at most 1,000 ms p95, and at most 16 KiB gzip; it passes all three.
The [Spectrum Table](https://opensource.adobe.com/spectrum-web-components/components/table/) was a
real candidate and remains pinned for audit reproduction, but its adapter adds a substantially
larger standalone closure and does not improve the framework-owned canonical value/event seam.
[Spectrum Grid](https://opensource.adobe.com/spectrum-web-components/tools/grid/) is a layout tool,
not a competing interactive data-grid behavior. The current
[Lion component inventory](https://lion.js.org/components/) exposes no Table or DataGrid component,
so there was no honest Lion candidate to benchmark.

Spectrum measurements are explicitly descriptive rather than a gate: attempting the same repeated
20-sample mount/remove profile exceeded the managed 4 GiB JavaScript heap, so the fixture caps that
candidate at three samples. The native candidate retains 20 samples and is the only selection gate.
The shipped component therefore uses native `table`, `button`, radio, and checkbox semantics with
Unifold-owned validation, sorting, canonical state, privacy export, and browser evidence. Spectrum
code is not imported by a published runtime package or the reference application.

## Derived JSON rules: candidate evaluation

| Field                 | Decision                                                                                |
| --------------------- | --------------------------------------------------------------------------------------- |
| Status                | Candidate identified; not accepted or installed until the bounded profile is executable |
| Candidate             | `json-logic-engine@5.0.7`, MIT, zero runtime dependencies                               |
| Purpose               | Evaluate portable pure JSON rules without implementing an expression language           |
| Required Unifold seam | Operator allowlist, declared reads, dependency DAG, cycle/budget checks, typed commands |
| Network/data behavior | Evaluation must be synchronous and local; async/custom operations remain disabled       |
| Owner                 | Contracts, IR, composition, reactivity, runtime, and security maintainers               |
| Review date           | 2026-08-25                                                                              |
| Fallback              | Keep derived rules unsupported rather than ship an unbounded or second state authority  |

The maintained [JSON Logic Engine](https://github.com/json-logic/json-logic-engine) provides modern
ESM/CJS packaging, TypeScript declarations, interpreter and compiled modes, and a JSON-Logic-compatible
operator vocabulary. It is a stronger current candidate than implementing an evaluator or adopting
the older `json-logic-js` package. Unifold has not accepted it yet: the library intentionally exposes
async evaluation, custom operations, extended operators, and function compilation, while portable
Unifold rules require a small synchronous allowlist, strict CSP compatibility, bounded AST depth and
work, and compile-time proof that every read was declared. The initial integration must use the
interpreter unless the compiled path is proven free of dynamic-code CSP requirements.

The 1,000-rule performance gate remains open until that real dependency graph exists. Benchmarking
1,000 RxJS selectors or calling the candidate directly would not prove dependency extraction,
topological once-only evaluation, cycle rejection, command budgets, or same-transaction behavior.
Acceptance requires upstream compatibility corpus evidence, malicious/deep-input cases, measured
bundle cost, a replacement port, and an explicit operator/version profile.

## Icon data: Lucide

| Field                 | Decision                                                                             |
| --------------------- | ------------------------------------------------------------------------------------ |
| Status                | Accepted for the Phase 1 core Icon allowlist                                         |
| Package               | `@lucide/icons@1.34.0`                                                               |
| Purpose               | Framework-neutral SVG node data and the upstream DOM builder                         |
| License               | ISC; named Feather-derived glyphs retain their MIT notice                            |
| Runtime dependencies  | None                                                                                 |
| Network/data behavior | No runtime network, storage, telemetry, or user-data access                          |
| Bundling              | Side-effect-free named imports; only six statically registered glyphs are referenced |
| Measured bundle delta | +4.64 kB minified JavaScript and +1.42 kB gzip; no CSS increase                      |
| Owner                 | Core catalog and elements maintainers                                                |
| Review date           | 2026-08-25                                                                           |
| Fallback              | Replace registry mappings while preserving Unifold `IconName` wire values            |

The official [`@lucide/icons`](https://lucide.dev/guide/packages/icons) package was selected because
it publishes icon data separately from framework components, documents individual tree-shakable
imports, and provides the DOM builder used by `unifold-icon`. The `lucide` browser package was not selected because Unifold does not need its
document-scanning renderer. Iconify's Lucide data was not selected because it adds a second icon
format and adapter without improving the initial allowlist. Copying SVG paths into Unifold was
rejected because it would fork upstream assets and obscure provenance.

The measured delta compares the same production reference build immediately before and after the
Icon slice: 351.37 kB/104.63 kB gzip became 356.01 kB/106.05 kB gzip. The upstream root export causes
more build-time module transforms even though production tree-shaking removes unreferenced glyphs;
upgrades must continue measuring both output size and build cost.

Portable JSON can select only the enum-backed `check`, `external-link`, `help`, `info`, `search`, and
`warning` names. It cannot dynamically import or index the full dependency namespace. Unifold owns
the stable names, token styling, accessible labeled/decorative semantics, catalog validation, and
browser evidence; Lucide owns glyph geometry and its builder. Brand logos are outside this catalog.

Exports that redistribute bundled Lucide data must retain [third-party notices](../THIRD_PARTY_NOTICES.md).
Dependency upgrades require the full component, accessibility, bundle, and browser matrix. A future
custom icon registry must declare provenance, license, integrity, fallback, and export permission
without weakening the core allowlist.

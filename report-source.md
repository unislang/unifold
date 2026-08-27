# Unifold Research Source: JSON-Defined Enterprise UI Runtime

Audience: framework architects, staff engineers, UI platform engineers, accessibility specialists, and product/design-tooling leads  
Date: 2026-08-24  
Canonical repository: [unislang/unifold](https://github.com/unislang/unifold)  
Status: canonical research synthesis supporting `ARCHITECTURE_IMPLEMENTATION_PLAN.md`

## Scope and assumptions

The decision is how to build an enterprise TypeScript framework in which UI is authored as JSON using the linked JsonUI project, rendered from a comprehensive Tailwind-styled Web Component catalog, normalized into a single event format, orchestrated with XState, designed through a provider-neutral AI chat experience, and exported as a reproducible prototype or application.

Assumptions: evergreen Chrome, Edge, Firefox, and Safari; WCAG 2.2 AA as the conformance baseline; React is acceptable inside the JsonUI adapter but not as a requirement for consuming the component library; cloud model credentials remain server-side; and the first supported language/runtime is TypeScript/JavaScript on the web.

Excluded from the first release: native mobile parity, untrusted third-party component execution, arbitrary model-generated JavaScript, pixel-perfect conversion from screenshots, collaborative multiplayer editing, and a general-purpose backend workflow engine.

## Direct executive answer

Build a framework-owned, versioned `UiDocument` contract whose `view` subtree uses JsonUI's
`$comp`/`$children` model. Pin the accepted syntax and compile it directly to Unifold IR; keep the
React-only, pre-1.0 `@jsonui/react` runtime isolated as a test oracle rather than application-state
authority. Render registered, framework-neutral Lit Web Components directly, with framework
adapters at the public boundary. Declare typed domain stores in JSON, validate bindings against
embedded schemas, and keep actual loading and persistence behind trusted host adapters. Every public
component publishes a machine-readable descriptor covering properties, attributes, slots, events,
accessibility invariants, tokens, and data classification. All meaningful component interactions
become a CloudEvents-compatible `UiEvent` carried by one composed, bubbling DOM `CustomEvent`; an
event hub validates, sequences, records, and routes it to a stable XState v5 actor system. Keep
executable actions, guards, actors, and side effects in a trusted named registry rather than JSON.

Use Tailwind at build time, not as a runtime interpreter. Component variants map to complete, statically discoverable Tailwind classes; CSS custom properties and `::part` are the supported theming surface. Use AI SDK Core/UI as a first-class orchestration layer: provider registry, typed chat messages, structured outputs, tool calls, and approval. The model proposes RFC 6902 patches against a base document revision. The system applies only complete patches that pass schema, catalog, security, accessibility, machine, and render checks. Production behavioral changes require policy and, where consequential, human approval.

Treat W3C WCAG 2.2 as normative and WAI-ARIA APG as the interaction-pattern reference. The Nielsen Norman Group report found during research is older usability guidance, not a current normative accessibility checklist; use it only to reinforce clarity, predictability, and usability testing with disabled participants.

## Evidence and reconciliation matrix

| Claim or decision | Evidence | Confidence | Contradiction / limitation | Resolution |
|---|---|---:|---|---|
| The linked JsonUI can express trees, bindings, actions, validation, JSONata transforms, and state export. | JsonUI repository README and `@jsonui/react` package README | High | Current implementation is React-only and its store semantics would create another state authority. | Pin and compile the structural syntax; keep the upstream runtime in a test-only parity boundary. |
| JsonUI is not an industry standard and is not Vercel `json-render`. | Separate first-party repositories and package names | High | Similar naming and overlapping generative-UI goals create confusion. | Name the dependency explicitly as `fodori/jsonui` / `@jsonui/react`; treat `json-render` only as comparative evidence. |
| Web Components can cross shadow boundaries with intent events. | DOM/MDN and Lit event documentation: custom events need `bubbles` and `composed`. | High | Shadow retargeting hides internal nodes from external listeners, and the intent can carry a non-public interaction value. | Put stable component identity and a bounded declared payload in trusted transient ingress; derive the public-safe runtime fact from authoritative classification and never depend on internal DOM targets. |
| Custom form controls can participate in native forms. | WHATWG form-associated custom elements and `ElementInternals`. | High | Browser/assistive-technology combinations still require regression testing. | Use native elements where possible; use form-associated custom elements only when necessary. |
| Tailwind cannot reliably discover interpolated runtime classes. | Tailwind source-detection documentation. | High | Safelists can grow CSS without bound. | Expose semantic variants and tokens, map them to static full classes, and compile JSON assets during export. |
| XState supports serializable references and deterministic actor processing. | XState v5 machines, actors, inspection, and testing docs. | High | XState v6 pages are alpha and subject to change. | Pin stable XState v5 and avoid v6-only APIs. |
| AI SDK supports multiple providers, structured streaming, typed UI messages, tools, and approvals. | AI SDK provider management, structured output, UIMessage, and tool approval docs. | High | Feature parity varies by provider; partial structured output is not schema-valid until complete. | Capability-test providers and apply only validated checkpoints. |
| Accessibility automation is necessary but insufficient. | axe-core states it finds roughly 57% of WCAG issues automatically. | High | Coverage changes by rule and component state. | Combine lint/axe with keyboard, screen-reader, zoom, contrast, forced-colors, and disabled-user testing. |
| A standard event envelope improves routing and interoperability. | CloudEvents defines required `id`, `source`, `specversion`, and `type`, plus schema and subject metadata. | High | Browser UI events are not themselves distributed CloudEvents. | Use a CloudEvents-compatible application profile inside the DOM `CustomEvent.detail`. |
| Patch proposals need concurrency guards and deterministic addressing. | RFC 6902 JSON Patch and RFC 6901 JSON Pointer. | High | Array indexes are fragile under concurrent edits. | Require base revision/hash, stable element IDs, `test` operations, and rebase/reject on conflict. |
| Component API metadata should be derived rather than copied into a second catalog. | Open WC Custom Elements Manifest analyzer and schema documentation | High | Accessibility, privacy, behavior, and test evidence cannot be inferred completely from TypeScript. | Generate source-owned API facts, validate them against the official schema, and join reviewed sidecars through drift tests. |
| Typed store bindings need both whole-value validation and pointer-to-subschema resolution. | JSON Schema 2020-12, RFC 6901, `json-schema-library`, `@sagold/json-pointer`, and `semver` | High | These libraries do not provide persistence, authorization, migration execution, conflict handling, or distributed atomicity. | Keep storage behind trusted adapters; reuse the libraries for schema, pointer, and version mechanics while Unifold owns policy and event semantics. |

## Material limitations and disagreements

1. “Every component definition available” has no finite web-platform meaning. The implementable interpretation is a catalog taxonomy, a repeatable component-definition contract, and an explicit coverage matrix against native HTML and WAI-ARIA APG patterns. Domain-specific widgets remain extensions.
2. Capturing “every property and attribute” verbatim is unsafe and not always serializable. Functions, DOM nodes, files, credentials, passwords, and provider objects must never be copied into events. The contract exposes every *declared public, JSON-serializable* property and attribute, subject to redaction and classification.
3. A single stream should not mean a global durable log of every pointer move and keystroke. The stream has one envelope and observation point, with policy-controlled sampling, coalescing, retention, and routing.
4. XState should not create one actor per simple button. Simple components emit facts; behavior lives in the nearest surface/feature actor. Complex widgets may use inspectable internal actors.
5. The Nielsen Norman Group material located is an older report called “Beyond ALT Text,” not a current artifact titled “web accessibility cheat sheet.” W3C WCAG and APG must remain the codified source of truth. If a different NN/g artifact was intended, it should be supplied and mapped as a supplementary source.
6. Lit SSR remains in a Labs/experimental package according to Lit’s documentation. Static/source export is appropriate for the first release; SSR/hydration needs a separate readiness gate.
7. A declared store is not a database, cache, authorization layer, or distributed transaction. The
   current synchronous adapter seeds normalized UI state and receives post-commit draft writes;
   source and persistence enums remain policy metadata until independently tested adapters exist.
8. Classification-aware disclosure makes the runtime stream metadata-only for internal,
   confidential, restricted, and never-export data, while ordinary public facts can carry full
   changes and snapshots. Derived store-write facts are always metadata-only. The bubbling DOM
   event remains trusted, value-bearing ingress, and external sinks still require independent
   authorization and redaction.

## Claim-to-source ledger

| Source | Publisher / author | Date or update | URL | Access notes / claims used |
|---|---|---|---|---|
| JSONUI README | fodori/jsonui | accessed 2026-08-24 | https://github.com/fodori/jsonui | JsonUI syntax, stores, actions/modifiers, validation, React-only status, state export. |
| `@jsonui/react` | npm / fodori | accessed 2026-08-24 | https://www.npmjs.com/package/@jsonui/react | Current pre-1.0 package and public API; search result used because direct page returned 403. |
| Web Components | MDN / Mozilla contributors | updated 2026 | https://developer.mozilla.org/en-US/docs/Web/API/Web_components | Custom elements, shadow DOM, templates, slots, event composition. |
| Form-associated custom elements | WHATWG | living standard | https://html.spec.whatwg.org/dev/custom-elements.html | `formAssociated` and `ElementInternals`. |
| Events | Lit | accessed 2026-08-24 | https://lit.dev/docs/v2/components/events/ | Props-down/events-up and composed bubbling events. |
| Shadow DOM and styles | Lit | accessed 2026-08-24 | https://lit.dev/docs/components/shadow-dom/ | Open shadow roots, encapsulation, slots. |
| Detecting classes in source files | Tailwind Labs | accessed 2026-08-24 | https://tailwindcss.com/docs/detecting-classes-in-source-files | Static class detection, dynamic-class limitation, `@source`. |
| XState actors | Stately | accessed 2026-08-24 | https://stately.ai/docs/actors | Sequential mailboxes, actor hierarchy, snapshots. |
| XState machines | Stately | accessed 2026-08-24 | https://stately.ai/docs/machines | JSON-serializable named implementations. |
| XState inspection | Stately | accessed 2026-08-24 | https://stately.ai/docs/inspection | Actor, event, snapshot, and microstep inspection. |
| XState testing | Stately | accessed 2026-08-24 | https://stately.ai/docs/testing | Unit and model-based testing through `xstate/graph`. |
| AI SDK provider management | Vercel | accessed 2026-08-24 | https://ai-sdk.dev/docs/ai-sdk-core/provider-management | Custom providers and provider registry. |
| AI SDK structured data | Vercel | accessed 2026-08-24 | https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data | `Output.object`, streaming, validation limit on partial output. |
| AI SDK tool usage | Vercel | accessed 2026-08-24 | https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage | Server/client tools and approval flow. |
| WCAG 2.2 | W3C WAI | Recommendation 2023; accessed 2026 | https://www.w3.org/TR/WCAG22/ | Normative A/AA requirements and new 2.2 criteria. |
| ARIA Authoring Practices patterns | W3C WAI | accessed 2026-08-24 | https://www.w3.org/WAI/ARIA/apg/patterns/ | Component semantics and keyboard patterns. |
| Beyond ALT Text | Nielsen Norman Group | older report; accessed 2026 | https://media.nngroup.com/media/reports/free/Usability_Guidelines_for_Accessible_Web_Design.pdf | Supplementary human-centered accessibility/usability guidance. |
| axe-core README | Deque Systems | accessed 2026-08-24 | https://github.com/dequelabs/axe-core | Automated testing coverage and WCAG rule support. |
| CloudEvents specification | CNCF CloudEvents | accessed 2026-08-24 | https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md | Standard envelope metadata and uniqueness rules. |
| JSON Patch | IETF / RFC Editor | RFC 6902, 2013 | https://www.rfc-editor.org/info/rfc6902/ | Patch operations and ordered application. |
| JSON Schema 2020-12 | JSON Schema project | 2020-12 | https://json-schema.org/draft/2020-12 | Schema dialect for documents and events. |
| Trace Context | W3C | Recommendation 2021 | https://www.w3.org/TR/trace-context/ | Portable trace correlation. |
| DOM XSS Prevention | OWASP | accessed 2026-08-24 | https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html | Do not evaluate JSON or inject it into unsafe sinks. |
| LLM improper output handling / excessive agency | OWASP GenAI Security | 2025 edition | https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/ | Validate model output and constrain agency. |
| Custom Elements Manifest analyzer | Open Web Components | accessed 2026-08-25 | https://custom-elements-manifest.open-wc.org/analyzer/getting-started/ | TypeScript analysis, Lit plugin, JSDoc API annotations, and analyzer phases. |
| `@custom-elements-manifest/analyzer` | npm / Open Web Components | version 0.11.0; accessed 2026-08-25 | https://www.npmjs.com/package/@custom-elements-manifest/analyzer | Exact analyzer release and MIT license. |
| `custom-elements-manifest` | npm / Open Web Components | version 2.1.0; accessed 2026-08-25 | https://www.npmjs.com/package/custom-elements-manifest | Official schema package release and BSD-3-Clause license. |
| Web Cryptography Level 2 | W3C | Candidate Recommendation Draft; accessed 2026-08-25 | https://www.w3.org/TR/webcrypto-2/ | Standard `SubtleCrypto` Ed25519 signing and verification behavior. |
| Node.js Web Crypto API | Node.js project | Node 22 documentation; accessed 2026-08-25 | https://nodejs.org/download/release/latest-jod/docs/api/webcrypto.html | Ed25519 stability and `sign`/`verify` support in the pinned runtime family. |
| JSON Canonicalization Scheme | IETF / RFC Editor | RFC 8785, 2020 | https://www.rfc-editor.org/rfc/rfc8785.html | Canonical JSON and the listed JavaScript `canonicalize` implementation used for request/backup fingerprints. |
| OpenFGA JavaScript SDK | OpenFGA project | accessed 2026-08-25 | https://github.com/openfga/js-sdk | Replaceable object-authorization adapter candidate, external-service model, retries, and Apache-2.0 provenance. |
| OpenTelemetry JavaScript | CNCF OpenTelemetry | accessed 2026-08-25 | https://opentelemetry.io/docs/languages/js/ | Stable trace and metrics APIs and provider-neutral telemetry boundary. |
| RFC 6901 JSON Pointer | IETF / RFC Editor | RFC 6901, 2013 | https://www.rfc-editor.org/rfc/rfc6901.html | Deterministic store path syntax and escaped reference tokens. |
| `json-schema-library` | npm / sagold | version 11.6.2; accessed 2026-08-25 | https://www.npmjs.com/package/json-schema-library | MIT-licensed Draft 2020-12 compilation, validation, and schema-node traversal. |
| `@sagold/json-pointer` | npm / sagold | version 7.2.1; accessed 2026-08-25 | https://www.npmjs.com/package/@sagold/json-pointer | MIT-licensed RFC 6901 value access and updates. |
| `semver` | npm / npm project | version 7.8.5; accessed 2026-08-25 | https://www.npmjs.com/package/semver | ISC-licensed semantic-version range evaluation. |

## Search record and stopping rationale

### 2026-08-25 pinned-profile implementation update

The published `@jsonui/core` and `@jsonui/react` 0.10.25 artifacts identify source commit
`5401b3d4900ca3032c108d6db00e8a819f4b28e9`. Their package manifests identify MIT licensing and the
official README and published declarations confirm
`$comp`, `$children`, `$child*`, `store`/`path` expansion, `$action`, `$modifier`, JSONata,
`$validations`, lists, localization, and state export. The consequential design conclusion is that
Unifold can preserve the structural syntax, but cannot adopt the upstream store/action semantics
without violating single state ownership. The implemented profile therefore pins the exact commit,
compiles component trees with array children and stable IDs, and rejects executable upstream
behavior. A later Unifold extension accepts `store`/`path` only when it refers to a typed
document-level store; it does not adopt the upstream get/set/error/touch expansion.

Evidence: [repository and README](https://github.com/fodori/jsonui),
[exact revision](https://github.com/fodori/jsonui/tree/5401b3d4900ca3032c108d6db00e8a819f4b28e9),
[store/path expansion source](https://github.com/fodori/jsonui/blob/5401b3d4900ca3032c108d6db00e8a819f4b28e9/packages/core/src/JsonUI/expandSimplifiedNode.ts),
and [MIT license](https://github.com/fodori/jsonui/blob/5401b3d4900ca3032c108d6db00e8a819f4b28e9/LICENSE).
Research stopped after the version, revision, license, syntax surface, state-ownership conflict, and
fallback boundary were verified directly. The resulting test-only React parity runner now executes
the pinned upstream artifacts across three browser engines; production adapter semantics remain a
separate decision.

### 2026-08-25 typed-store implementation update

Store definitions require two different schema operations: validating a complete adapter value and
resolving a control's RFC 6901 pointer to a subschema before runtime. The implementation reuses
`json-schema-library@11.6.2` for both operations rather than building a partial Draft 2020-12 engine.
It rejects remote references, so compilation remains deterministic and network-free.
`@sagold/json-pointer@7.2.1` supplies runtime get/set mechanics, and `semver@7.8.5` supplies adapter
compatibility checks. Their installed manifests identify MIT, MIT, and ISC licensing respectively.

Unifold still owns the consequential semantics: enum-backed source/access/ownership/persistence/
classification policy, catalog value-type compatibility, immutable IR bindings, pre-mount adapter
validation, normalized transactions, typed post-commit writes, and canonical effect facts. The
libraries and the current synchronous adapter do not provide persistence, subscriptions, migration
execution, encryption, authorization, conflict resolution, or distributed atomicity. Research
stopped once established schema, pointer, and version libraries covered the replaceable mechanical
boundaries; production adapter selection and those operational guarantees remain explicit work.

### 2026-08-25 component-definition feasibility update

The official Custom Elements Manifest analyzer parses TypeScript and provides a Lit framework
plugin plus source annotations for fields, attributes, slots, events, CSS parts, and CSS custom
properties. The implementation pins analyzer 0.11.0, validates its complete twenty-element output
against the official 2.1.0 schema package, and joins the generated facts to reviewed catalog
sidecars. This avoids implementing another TypeScript/Lit analyzer while keeping accessibility,
privacy, behavior, structured semantics, examples, and test evidence under explicit human review.

Research stopped after the official integration surface, exact versions, licenses, schema validity,
no-runtime-dependency boundary, and replacement seam were verified. The deep Lit-plugin import is a
version-sensitive limitation protected by executable tests. Full-catalog generation and drift
coverage are now implemented; complex-component adapter comparisons and stable accessibility
evidence remain open.

### 2026-08-25 document-trust implementation update

W3C Web Cryptography Level 2 defines Ed25519 signing and verification through `SubtleCrypto`; the
official Node 22 documentation marks Ed25519 stable from Node 22.13. Unifold therefore uses the
platform implementation rather than custom cryptography or another dependency. The detached
envelope signs exact UTF-8 document payload bytes, and the loader verifies before parsing or running
trusted migrations. This preserves the reviewed original representation and keeps schema evolution
separate from integrity evidence.

Research stopped after algorithm availability, pinned-runtime stability, exact-byte verification,
and the no-network platform boundary were confirmed. Key distribution, rotation, revocation,
authorization, and audit remain explicit control-plane responsibilities rather than claims made by
the envelope.

### 2026-08-25 control-plane seam update

RFC 8785 identifies the existing Apache-2.0 `canonicalize` JavaScript implementation, which the
control-plane seam reuses for stable effect and backup fingerprints. OpenFGA provides a maintained
JavaScript SDK for external fine-grained object authorization, while OpenTelemetry JavaScript
publishes stable trace APIs. Unifold now bundles only narrow structural mappings for their official
client/API shapes: deployments still own the external service, model, configuration, credentials,
retry, data export, sampling, and operational decisions.

The implemented package therefore owns only Unifold-specific protocol and orchestration: trusted
session-derived tenancy, deny-by-default capability/resource checks, revision concurrency,
idempotency leases, safe audit metadata, resumable sequences, and verified restore. A deterministic
shared-schema/tenant-key in-memory adapter supplies executable conformance evidence. Research
stopped after the standards and mature adapter boundaries showed that building production identity,
authorization, tracing, queue, or backup infrastructure inside Unifold would duplicate existing
systems. The subsequent implementation adds a bounded durable-outbox contract and a second store
over Node SQLite, using database transactions and unique tenant/idempotency keys rather than a
parallel protocol. The same conformance suite now proves memory/SQLite revision, recovery,
concurrent reservation, lease-expiry, stale-owner, and replay behavior, while injected SQLite
triggers prove full mutation rollback. Node 22.14 emits an experimental warning for `node:sqlite`;
the follow-up implementation also proves exact OpenFGA tuples and fail-closed checks,
classification-safe OpenTelemetry attributes, cookie session/CSRF admission, AES-256-GCM external
envelopes, and scheduled-callable SQLite scratch restore before last-known-good advancement. Thus
live authorization/telemetry provisioning, failure-domain vault/key operations, scheduled drill
alerts, durable CSRF/session revocation controls, and production driver acceptance remain explicit
release gates.

Research covered the linked JsonUI site, repository, and package; Vercel AI SDK Core/UI; XState stable v5 and v6-alpha distinctions; Web Components and form participation; Lit composition/styling/SSR; Tailwind v4 source detection; WCAG 2.2 and ARIA APG; NN/g accessibility material; axe-core; CloudEvents; JSON Schema/Patch; trace context; and OWASP browser/LLM guidance.

Research stopped after all consequential architecture claims had first-party or standards evidence, the naming ambiguity between JsonUI and `json-render` was resolved, version-sensitive choices were bounded, and additional searches were repeating rather than changing the recommended architecture. The unresolved product choices are explicitly listed in the implementation plan.

## 2026-08-26 Toast accessibility contract update

Audience and decision: component authors and framework consumers need one stable Toast contract that
can enter the unified event/state path without weakening Unifold's WCAG 2.2 AA baseline. The focused
research covers live-region urgency, focus, dismissal, and content-owned timing. It excludes a
durable notification center, global user timing preferences, and action-bearing notifications; those
require separate compositions and recovery behavior.

The stable Toast is persistent and timer-free. A minimum timeout and a dismiss button are not enough:
WCAG 2.2 Timing Adjustable explicitly uses a five-second toast as its example and permits that timing
only when users can obtain the equivalent information by another means. Unifold does not yet have a
catalog-authoritative durable notification center or user-level turn-off/adjust/extend policy, so a
finite `duration` would make an accessibility claim the framework cannot prove. State/effects may
remove a Toast only under an application policy that independently satisfies the criterion; the
component itself never schedules removal.

Advisory informational and success messages use an atomic `status` live region; important warning
and error messages use an atomic `alert` live region. The live text is separate from any dismiss
button so atomic announcement does not include the control label. Insertion never moves focus.
Dismissal is an optional native-button intent that enters the canonical stream; the component does
not mutate authoritative application state or require users to acknowledge an alert. An interaction
that must interrupt work or acquire a response is an alert dialog, not a Toast.

| Claim / contract decision | Primary evidence | Confidence | Remaining limitation |
|---|---|---:|---|
| Status messages must be exposed without receiving focus; advisory results/status use `role=status`, while warnings/errors can use `role=alert`. | [WCAG 2.2 Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages) | High | Automated DOM/axe evidence does not replace manual assistive-technology announcement testing. |
| `status` is implicitly polite and atomic; `alert` is implicitly assertive and atomic and does not require focus. | [WAI-ARIA 1.2 status and alert roles](https://www.w3.org/TR/wai-aria/#status) | High | Announcement behavior can still vary by browser/assistive-technology combination. |
| Alerts must not move keyboard focus, and auto-disappearing alerts are discouraged. | [ARIA Authoring Practices alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) | High | A focusable dismiss control needs ordinary native-button testing in addition to the alert pattern. |
| A five-second toast is exempt from timing adjustment only when equivalent information remains available elsewhere. | [WCAG 2.2 Understanding SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) | High | A future timer requires a durable alternative or user-configurable turn-off/adjust/extend policy and new executable evidence. |

The search stopped after the normative role, focus, and timing questions converged across WCAG,
WAI-ARIA, and APG. Further generic toast-library guidance would be weaker than these primary sources
and would not change the persistent, timer-free v1 decision.

## 2026-08-26 Pagination accessibility contract update

Audience and decision: component authors need a predictable navigation primitive, while application
state and data-source actors—not a view-local page-window algorithm—remain authoritative. Pagination
therefore accepts an explicit ordered JSON item list with stable identities, visible and accessible
labels, finite item kinds, safe optional destinations, and current/disabled state. This keeps bounded
and unbounded sets, localization, routing, and server-derived windows outside the dumb component.

The rendered contract is a descriptively named `nav` landmark containing one unordered list. Exactly
one page item is current and receives `aria-current="page"`; current pages may remain links because
that is robust during both link-list and sequential navigation. Number-only visible labels require a
descriptive accessible label such as “Page 10.” Previous and next are explicit authored items, and
an overflow marker is noninteractive. Native links preserve no-JavaScript navigation. Items without
a destination use native buttons whose trusted activation enters the unified event stream; disabled
items are not interactive. Pagination never moves focus after activation because the destination or
application state owns the resulting content and focus policy.

| Claim / contract decision | Primary evidence | Confidence | Remaining limitation |
|---|---|---:|---|
| Pagination is a navigation landmark with a unique descriptive label and list semantics. | [U.S. Web Design System Pagination](https://designsystem.digital.gov/components/pagination/) | High | Landmark-label uniqueness depends on the consuming page and needs page-level tests. |
| The current page is conveyed programmatically with `aria-current="page"`, not color alone. | [W3C ARIA26 technique](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA26) | High | Visual contrast and forced-colors behavior still need rendered-theme evidence. |
| Numeric page links need names that communicate link purpose, including when links are inspected out of surrounding visual context. | [WCAG 2.2 Understanding SC 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context) | High | Localization remains authored data; the component must not synthesize English. |
| Keyboard order must follow the logical visual sequence, expose roles/current value, avoid traps, and retain visible focus. | [USWDS Pagination accessibility tests](https://designsystem.digital.gov/components/pagination/accessibility-tests/) | High | Automated Playwright/axe checks do not replace the documented manual screen-reader matrix. |

The search stopped once current-page semantics, landmark/list structure, link naming, keyboard order,
and focus requirements converged. The implementation deliberately does not adopt USWDS's seven-slot
windowing algorithm: explicit JSON items avoid duplicating data-source logic and support both bounded
and unbounded application policies without creating a second state authority.

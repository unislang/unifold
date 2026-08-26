# `@unislang/unifold-semantics`

Compiles a versioned, allowlisted Schema.org graph from committed Unifold node snapshots. A binding
can name a node directly or resolve a typed control-value selection through a composition instance
export. It is publishable only when the resolved node is visible, public, and exposes a committed
control value.

The authoritative `SemanticGraph` types, enum values, and executable schema live in
`@unislang/unifold-contracts`; this package re-exports the public values and types. Call
`assertSemanticGraph` from the `/validation` export at a standalone untrusted JSON boundary. It uses
Ajv's JSON Schema 2020-12 implementation and returns structured schema diagnostics on failure. The
separate export keeps Ajv out of consumers that only compile trusted, already-validated graphs.

The compiler emits deterministic JSON-LD with the pinned Schema.org 30.0 context. `publishJsonLd`
owns one light-DOM document-head script, sets its content through `textContent`, safely replaces
prior output from the same owner, and rejects conflicting or duplicate publications. A coordinator
that has already validated a static artifact may provide its expected prior owner for one atomic
ownership handoff; arbitrary competing owners are never replaced.

This first slice includes `WebSite`, `WebPage`, `Organization`, and `Person`. Registry expansion must be generated from the pinned official release data and reviewed with each supported publication profile.

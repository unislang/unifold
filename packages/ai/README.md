# `@unislang/unifold-ai`

The server-side, provider-neutral AI proposal boundary for Unifold. It uses Vercel AI SDK structured
output, Zod validation, RFC 6902 patching, and RFC 8785 canonical hashes. Provider credentials do not
belong in a browser bundle, and model output never mutates a mounted application directly.

`generateUiPatchProposal` accepts any AI SDK `LanguageModel`. `evaluateUiPatchProposal` then checks
the schema, base revision and hash, allowed paths and operations, optimistic revision test, risk
approval, patch application, composition expansion, and IR compilation. Only an accepted candidate
should be passed to `application.update(candidate)` for renderer preflight and atomic reconciliation.
`commitUiPatchProposal` performs that final handoff against the application's defensively copied
authored source. `canonicalJson(application.authored)` produces deterministic prototype JSON for
storage or download without exporting derived IR or runtime state.

Presentation-only proposals can pass without approval. Interaction, behavior, data, and external
effect proposals return `review-required` until explicitly approved. The initial safe profile permits
`test`, `add`, `remove`, and `replace` only under `view`, `compositions`, `semantics`, and `revision`.
It rejects root/identity/catalog/schema changes, move/copy, prototype-polluting paths, stale bases,
incomplete patches, and invalid compiled documents.

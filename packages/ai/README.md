# `@unislang/unifold-ai`

The server-side, provider-neutral AI proposal boundary for Unifold. It uses Vercel AI SDK structured
output, Zod validation, RFC 6902 patching, and RFC 8785 canonical hashes. Provider credentials do not
belong in a browser bundle, and model output never mutates a mounted application directly.

Production integrations should call `generateGovernedUiPatchProposal`. It resolves a server-owned
route through the AI SDK provider registry only after verifying a strict, canonical Ed25519-signed
provider/model manifest. The manifest binds capabilities, eligible data classifications and regions,
token limits, pricing, prompt/policy/evaluation versions, validity, and retirement. Eligibility is
rechecked against the injected clock for every request; `never-export` data is always rejected.

The governed path requires bounded request/tenant/user IDs, a W3C-shaped nonzero trace ID, a
provider-specific conservative token estimator, and an atomic budget ledger. It reserves the
worst-case token/cost envelope before provider I/O, passes explicit output/retry/timeout limits to AI
SDK 7, settles normalized usage, rejects overruns, and returns a redacted receipt containing only
safe routing, signed-version, usage, cost, and timing metadata. Raw provider and ledger errors never
enter the result.

`generateUiPatchProposal` accepts an arbitrary AI SDK `LanguageModel` and remains available as a
low-level adapter and deterministic test primitive. It is not the production governance boundary.
`evaluateUiPatchProposal` checks schema, base revision/hash, allowed paths and operations, optimistic
revision tests, risk approval, patch application, composition expansion, and IR compilation. Only an
accepted candidate should reach `application.update(candidate)`. `commitUiPatchProposal` performs
that final handoff against the application's defensively copied authored source.

Generation accepts the authored document plus its `ComponentDefinitionDocument`; callers cannot
substitute a free-form catalog summary. `buildUiAiContext` validates the authored document, checks
catalog identity and component coverage, projects only operation-relevant catalog capabilities, and
omits each component's declared `sensitiveProperties`. The versioned context is rejected before a
provider call when its definition, property, or encoded-byte limits are exceeded. The proposal hash
still binds to the complete local authored document, while the provider sees only the redacted copy.

Presentation-only proposals can pass without approval. Interaction, behavior, data, and external
effect proposals return `review-required` until explicitly approved. The initial safe profile permits
`test`, `add`, `remove`, and `replace` only under `view`, `compositions`, `semantics`, and `revision`.
It rejects root/identity/catalog/schema changes, move/copy, prototype-polluting paths, stale bases,
incomplete patches, and invalid compiled documents.

Automatic provider failover is intentionally not implemented by this slice. A future failover must
select another independently verified and eligible manifest, start a new trace/reservation, retain
both audit receipts, and never concatenate partial output from different models.

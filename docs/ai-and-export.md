# AI proposals and prototype export

`@unislang/unifold-ai` is a server-oriented proposal boundary, not an alternate renderer or state
store. It uses the Vercel AI SDK for provider-neutral structured output. The model returns a bounded
`UiPatchProposal`; it never returns component code and never receives permission to mutate a mounted
application directly.

The raw-model entry is a low-level adapter for tests and custom server gateways:

```ts
import { generateUiPatchProposal, commitUiPatchProposal } from "@unislang/unifold-ai";

const proposal = await generateUiPatchProposal({
  componentDefinitions,
  document: application.authored,
  model,
  prompt: "Make the customer name label more specific"
});

const result = await commitUiPatchProposal({ application, proposal });
```

Production server paths use `generateGovernedUiPatchProposal`. A signed Ed25519 manifest binds an
exact provider/model to structured-output capability, eligible classifications and regions,
evaluation/prompt/policy versions, validity and retirement windows, token limits, and integer
micro-USD pricing. `createUiAiProviderRouteRegistry` verifies the manifest through Web Crypto and
wraps the Vercel AI SDK provider registry; callers select a server-owned route alias, never a raw
browser-supplied provider/model ID.

Before provider I/O, governed generation validates trusted request identifiers, builds the redacted
catalog context, obtains a provider-specific upper-bound token estimate, verifies manifest and host
limits, calculates cost with integer arithmetic, and atomically reserves a tenant/user/request
budget through the injected ledger. The AI SDK receives explicit output-token, retry, cancellation,
and total-timeout controls. Normalized usage is required afterward; settlement failure, missing or
over-limit usage, provider failure, cancellation, and timeout all return stable redacted
diagnostics. A successful safe receipt contains identifiers, manifest and signature-key evidence,
policy/prompt versions, limits, duration, normalized usage, and calculated cost—never prompts,
model output, credentials, or raw provider errors.

The complete proposal is validated by Zod, tied to an RFC 8785 SHA-256 base hash and exact revision,
checked against the safe path and operation policy, applied by an RFC 6902 library, and passed through
normal composition and IR compilation. The accepted candidate then uses the public application update
coordinator for renderer preflight and atomic state/DOM reconciliation.

Before recursive schema parsing, proposal data passes an iterative 1 MiB, 64-level, 50,000-value,
65,536-byte-string, plain-object, finite-number, no-cycle/shared-value, and prototype-key boundary.
Existing stable IDs cannot disappear through an ancestor replacement. The optional semantics root
may be created only by an approved `add`; wholesale replace and remove remain forbidden.

The model context is built by the framework from the generated `ComponentDefinitionDocument`, not
from a caller-authored catalog summary. It is byte/count bounded, verifies document/catalog identity,
rejects unknown components, and recursively omits every sidecar-declared sensitive property before
provider invocation. The full authored document remains local and is used only to calculate the
exact base fingerprint.

Proposal risk is also framework-derived from affected paths and nested values. A model may declare a
more restrictive risk but cannot downgrade behavior, data, semantic, resource, or external-effect
changes to presentation-only.

The initial policy permits `test`, `add`, `remove`, and `replace` under `view`, `compositions`,
`semantics`, and `revision`. It requires the first operation to test the base revision and another to
replace it. Stable-ID targets, root and contract metadata, move/copy, prototype-polluting paths, stale
bases, invalid components, and incomplete proposals are rejected. Only presentation-risk changes can
apply without review; interaction, behavior, data, and external-effect risks require explicit
approval.

`requestedChecks` uses `UiPatchRequestedCheck` rather than open strings. Compiler validation always
runs; requested accessibility-contract and static-export preflights must also pass before preview or
apply. `expectedOutcomes` remains bounded human-readable proposal evidence until the host supplies a
durable, executable product-evaluation contract.

Provider credentials remain on the server. Partial structured streams may inform chat progress, but
only a complete schema-valid object enters evaluation. Hosts still own authenticated identity,
durable atomic ledgers and audit storage, trust-key rotation/revocation, approved provider clients,
and deployment policy. Governed failover, partial-progress streaming, and durable multi-actor Studio
approvals remain later slices; the framework does not silently concatenate attempts or invent usage.

The framework safety instructions are always present in the AI SDK system prompt. A host-supplied
system instruction extends that baseline; it cannot replace the rule that proposals remain
schema-valid data and never contain executable UI code or credentials.

## Governed Studio session

`@unislang/unifold-studio` connects the server proposal boundary to an isolated preview,
deterministic document diff, explicit apply, and both export formats. The Studio receives proposal and
evaluation ports, so AI SDK providers and credentials remain outside browser bundles. The candidate
is mounted as a disposable Unifold application with production stores/effects disabled; the live
application is unchanged until `apply()` revalidates the current base and calls its atomic `update()`
method. The preview diff stays tied to the exact evaluated base, and a synchronous final canonical
comparison prevents a live edit made during async evaluation from being overwritten in the browser's
single-threaded coordinator.

This first package is intentionally a single-user prototype boundary. Its `approve()` method does not
claim durable actor identity, authorization, separation of duties, multi-user rebase, or audit
receipts; those remain collaboration/control-plane work.

## Portable prototype export

`@unislang/unifold-export` is browser-safe and independent of the AI SDK:

```ts
import { UnifoldExportStatus, exportUnifoldApplication } from "@unislang/unifold-export";

const result = await exportUnifoldApplication(application);
if (result.status === UnifoldExportStatus.Exported) {
  save("ui.json", result.output.content);
  save("unifold-manifest.json", result.output.manifestContent);
}
```

The export validates the current defensively copied authored source and emits canonical JSON plus a
versioned SHA-256 integrity manifest. It excludes derived IR, runtime values, event history, and
credentials. Identical authored revisions produce byte-identical output. Standalone static apps,
embeddable Web Component packages, and source workspaces remain explicit later export formats.

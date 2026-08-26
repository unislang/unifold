# AI proposals and prototype export

`@unislang/unifold-ai` is a server-oriented proposal boundary, not an alternate renderer or state
store. It uses the Vercel AI SDK for provider-neutral structured output. The model returns a bounded
`UiPatchProposal`; it never returns component code and never receives permission to mutate a mounted
application directly.

```ts
import { generateUiPatchProposal, commitUiPatchProposal } from "@unislang/unifold-ai";

const proposal = await generateUiPatchProposal({
  catalogSummary,
  document: application.authored,
  model,
  prompt: "Make the customer name label more specific"
});

const result = await commitUiPatchProposal({ application, proposal });
```

The complete proposal is validated by Zod, tied to an RFC 8785 SHA-256 base hash and exact revision,
checked against the safe path and operation policy, applied by an RFC 6902 library, and passed through
normal composition and IR compilation. The accepted candidate then uses the public application update
coordinator for renderer preflight and atomic state/DOM reconciliation.

The initial policy permits `test`, `add`, `remove`, and `replace` under `view`, `compositions`,
`semantics`, and `revision`. It requires the first operation to test the base revision and another to
replace it. Stable-ID targets, root and contract metadata, move/copy, prototype-polluting paths, stale
bases, invalid components, and incomplete proposals are rejected. Only presentation-risk changes can
apply without review; interaction, behavior, data, and external-effect risks require explicit
approval.

Provider credentials remain on the server. Partial structured streams may inform chat progress, but
only a complete schema-valid object enters evaluation. Applications should redact document context,
apply tenant/model allowlists and budgets, and retain proposal, approval, prompt-policy, and model
metadata in their durable audit implementation.

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

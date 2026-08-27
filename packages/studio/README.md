# `@unislang/unifold-studio`

Headless, browser-safe orchestration for a governed Unifold design session. A Studio host injects a
server-owned proposal client and evaluator, while the package owns XState lifecycle, supersession,
isolated preview, deterministic diff, explicit apply, and portable/static export.

The live application is never used as a preview surface. Provider credentials and Vercel AI SDK
model instances remain behind the injected server boundary. A complete proposal must pass the AI
policy and compiler before `StudioSessionState.PreviewReady`; only `apply()` calls the live
application's normal atomic `update()` coordinator.

```ts
import { evaluateUiPatchProposal } from "@unislang/unifold-ai/evaluation";
import { createUnifoldStudioPreview, UnifoldStudioSession } from "@unislang/unifold-studio";

const studio = new UnifoldStudioSession({
  application,
  evaluator: { evaluate: evaluateUiPatchProposal },
  preview: createUnifoldStudioPreview(previewElement),
  proposalClient: {
    // This crosses your authenticated application boundary; it does not import a model client.
    propose: ({ document, prompt, selectedNodeId, signal }) =>
      proposalApi.create({ document, prompt, selectedNodeId, signal })
  }
});

await studio.request({ prompt: "Clarify the customer name label" });
await studio.apply();
const exported = await studio.export();
```

Starting a newer request aborts and supersedes an older result. Partial output never enters the
session. Consequential proposals stop at `review-required`; `approve()` records only a local
single-user approval and re-evaluates the exact base before preview. Durable identity,
separation-of-duties, multi-user rebase, and approval audit belong to the collaboration/control-plane
profile and are not claimed by this package.

`createUnifoldStudioPreview()` disables semantic publication, production stores, registered machine
commands, and runtime effect commands. It mounts a separate disposable application, so preview
interactions cannot mutate the live application or call its production effects.

# Unifold Studio dogfood example

This browser example uses `@unislang/unifold-studio` to run one governed design loop:

1. The chat controls and live application are genuine authored `UiModule@1.0.0` JSON sources. Both
   import the small presentation composition through the exact same SHA-256 integrity and the
   `presentation` namespace before resolving to deterministic application artifacts.
2. A clearly labelled deterministic local mock returns a data-only patch proposal. It uses no
   credentials, provider, model, or browser-side Vercel AI SDK instance.
3. Studio evaluates the complete proposal and mounts it in an effect-free isolated container. The
   live application remains unchanged until **Apply**.
4. **Export** produces the applied document as portable JSON and standalone static HTML.

`src/modules/control.project.json` and `src/modules/live.project.json` declare the reviewed source
graphs. Their committed locks pin module, expanded artifact, and prepared IR integrity. Every build
runs the packaged `unifold module check` command first and fails if a source, import, namespace,
artifact, or lock drifts.

Run `pnpm --filter @unislang/unifold-studio-example dev` and open the printed local URL. This is a
dogfood harness for framework behavior, not a simulated production AI integration; real proposal
clients belong behind the trusted server boundary described by `@unislang/unifold-studio`.

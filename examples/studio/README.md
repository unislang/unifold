# Unifold Studio dogfood example

This browser example uses `@unislang/unifold-studio` to run one governed design loop:

1. The chat controls and live application are authored as JSON, wrapped in exact `UiModule@1.0.0`
   identities, and resolved to deterministic integrity-verified artifacts before either mount.
2. A clearly labelled deterministic local mock returns a data-only patch proposal. It uses no
   credentials, provider, model, or browser-side Vercel AI SDK instance.
3. Studio evaluates the complete proposal and mounts it in an effect-free isolated container. The
   live application remains unchanged until **Apply**.
4. **Export** produces the applied document as portable JSON and standalone static HTML.

Run `pnpm --filter @unislang/unifold-studio-example dev` and open the printed local URL. This is a
dogfood harness for framework behavior, not a simulated production AI integration; real proposal
clients belong behind the trusted server boundary described by `@unislang/unifold-studio`.

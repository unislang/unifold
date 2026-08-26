# JsonUI upstream parity runner

This test-only workspace executes the real pinned `@jsonui/react` artifact beside Unifold. It is an
oracle for JsonUI tree traversal, static property delivery, ordered children, and visible semantic
output; it is not a runtime adapter and never installs JsonUI state, actions, modifiers, validation,
or export callbacks as Unifold application authority.

Artifact versions, npm integrity hashes, licenses, and source revisions are committed in
`fixtures/upstream-artifacts.json` and checked before the browser suite starts.
The copied official example records its source, transformation, revision, license, and SHA-256 in
`fixtures/upstream/fixture-provenance.json`.

Compatible public corpus cases compare the component IDs, types, direct-child order, static
properties, visible output, normalized Unifold IR, and zero-event initialization across Chromium,
Firefox, and WebKit. The official quick example is an intentional negative: upstream renders it,
while Unifold reports exact unsupported-profile diagnostics before creating a DOM application.

Run from the workspace root with `pnpm test:jsonui-parity`. The Vite build is intentionally isolated
and must never be used as a production bundle or imported by a published package.

# Framework host parity

This workspace proves that Unifold's standards-based renderer and public application facade operate
without a framework-specific state authority. The same JSON document and browser journey run in
plain DOM, React 19, Vue 3, and Svelte 5 shells.

Each host must demonstrate:

- direct Web Component property assignment, dashed `unifold-event` handling, and default slots;
- one application mount and one normalized runtime value authority;
- the same intent, command, and committed-transaction ordering for one input;
- retained Web Component identity, value, and focus when only the framework shell rerenders; and
- deterministic framework teardown that disposes the Unifold application.

Run the shared Chromium, Firefox, and WebKit projects with:

```sh
pnpm test:e2e:host-parity
```

Set `PLAYWRIGHT_HOST_PARITY_PORT` to override the strict local port `4177`, or use
`PLAYWRIGHT_HOST_PARITY_BASE_URL` for an externally served `dist` directory. `pnpm test:consumer`
copies this workspace to an operating-system temporary directory and reruns Chromium against packed
Unifold tarballs, proving the host matrix does not depend on workspace links or private imports.

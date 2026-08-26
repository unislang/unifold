# Standalone static-export proof

This workspace proves the production boundary between deterministic no-JavaScript export and safe
client enhancement. `pnpm build` generates `index.html` and `unifold-manifest.json` directly from
`ui.json`; it does not inject the client bundle into either artifact. Vite builds `upgrade.js` as a
separate asset that a host may load later.

The Playwright matrix verifies:

- byte-exact served HTML and its SHA-256 manifest;
- visible native content and one Schema.org JSON-LD graph with JavaScript disabled;
- edited value and focus migration into the normalized runtime;
- an atomic JSON-LD ownership handoff with no duplicate publication;
- one intent, command fact, and committed transaction for one interaction; and
- non-mutating rejection of structural and semantic-owner tampering.

Run the complete Chromium, Firefox, and WebKit matrix from the repository root:

```sh
pnpm test:e2e:static-export
```

Use `PLAYWRIGHT_STATIC_EXPORT_PORT` to override the strict local port `4175`, or set
`PLAYWRIGHT_STATIC_EXPORT_BASE_URL` to test an externally managed copy of the built `dist`
directory. Generated HTML and manifest files are ignored because `pnpm build` must reproduce them
from the authored JSON before every browser run.

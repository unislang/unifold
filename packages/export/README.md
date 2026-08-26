# `@unislang/unifold-export`

Deterministic, browser-safe export utilities for Unifold prototypes and applications. The package
supports portable JSON and a deterministic, no-JavaScript static HTML fallback. Each artifact has a
canonical SHA-256 integrity manifest.

```ts
const result = await exportUnifoldApplication(application);
if (result.status === UnifoldExportStatus.Exported) {
  download("ui.json", result.output.content);
  download("unifold-manifest.json", result.output.manifestContent);
}
```

Exports use the application's defensively copied authored source. Normalized IR, runtime snapshots,
provider credentials, and event values are not included. Identical authored revisions produce
identical content, manifest, and digest.

## Static HTML fallback

```ts
const result = await createStaticHtmlExport(authoredDocument);
if (result.status === UnifoldExportStatus.Exported) {
  save("index.html", result.output.content);
  save("unifold-manifest.json", result.output.manifestContent);
}
```

The static target compiles through the normal composition and IR boundary, then renders native HTML
for every core reference component. Every node has stable `data-unifold-static-node-id` and
`data-unifold-static-component` markers, the root identifies its document, and leaf value controls
have `data-unifold-static-control`. These markers are consumed by the validated
`UnifoldApplicationMountMode.UpgradeStatic` path in `@unislang/unifold`; export generation itself
remains runtime-free.

`VirtualList` exports a meaningful bounded listbox fallback: the first 200 public options plus a
selected option outside that window, with set size, position, selected, and disabled semantics. It
also reports how much of the collection is shown. Interactive scrolling remains an upgrade-time
capability.

`Table` exports its native caption, column headers, first-column row headers, and scalar cells. All
content and row identities are escaped. A table bound to anything other than a Public store exports
an empty table shell so captions, schema labels, row identities, and cell values cannot cross the
classification boundary.

Visible text and attributes are HTML-escaped, password values are omitted, and values bound to any
non-public store classification are not serialized. The document contains exactly one script-safe
Schema.org JSON-LD block. A graph that binds Internal, Confidential, Restricted, or NeverExport data
rejects the export rather than silently publishing a partial or downgraded graph. Documents without
authored semantics receive one deterministic empty Schema.org graph so crawlers and upgrade code see
one stable publication owner.

The fallback contains no executable inline script, provider credentials, runtime event values, or
store adapter data. Hosts explicitly add their application bundle and select safe upgrade;
embeddable component packages and source workspaces remain distinct export stages.

`signUiDocumentPayload(content, keyId, privateKey)` creates the versioned detached-signature envelope
consumed by `loadUnifoldDocument()`. It uses the platform Web Crypto Ed25519 implementation and signs
the exact UTF-8 content. Run signing in a trusted build or server; never bundle a private key into an
application. See [document trust and migrations](../../docs/document-trust.md).

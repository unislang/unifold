# `@unislang/unifold-compositions`

This package validates and deterministically expands reusable JSON composition definitions before IR compilation.

It also provides `expandLayoutDocument()` for the higher-level hierarchy-oriented
`layoutType`/`variables`/`type`/`props`/`children` authoring form. Layout lowering runs before the
composition expander and produces the same canonical JsonUI tree; it does not introduce another
renderer or state model.

Reviewed host modules can be snapshotted with `createTrustedLayoutDefinitionRegistry()` and passed
to `expandLayoutDocument()` as `{ registry }`. The bounded registry performs no network or module
resolution, requires an exact version, rejects collisions with local definitions, and reports
virtual `/$layoutRegistry/definitions/...` source pointers.

```ts
import {
  CompositionExpansionStatus,
  expandComposedUiDocument
} from "@unislang/unifold-compositions";
import { compileUiDocument } from "@unislang/unifold-ir";

const expansion = expandComposedUiDocument(authoredDocument);
if (expansion.status !== CompositionExpansionStatus.Valid || expansion.document === undefined) {
  throw new Error(JSON.stringify(expansion.diagnostics));
}

const compilation = compileUiDocument(expansion.document);
```

Definitions use exact version pins, scalar structural parameters, declared slots, and typed
selection, event, and command exports. Successful expansion returns the compiler-ready document with
a versioned instance/provenance manifest, plus the compatibility `exportsByInstanceId` alias table.
The IR validates and preserves the manifest. Invalid documents return structured diagnostics and no
partial document.

See [Reusable JSON compositions](../../docs/compositions.md) for the contract, namespace rules, limitations, and P0 stabilization work.

# `@unislang/unifold-compositions`

This package validates and deterministically expands reusable JSON composition definitions before IR compilation.

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

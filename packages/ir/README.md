# `@unislang/unifold-ir`

Pure validation and compilation from Unifold's pinned JsonUI-shaped contract to
a framework-neutral, normalized intermediate representation.

```ts
import { compileUiDocument, CompilationStatus } from "@unislang/unifold-ir";

const result = compileUiDocument(input);
if (result.status === CompilationStatus.Valid && result.document !== undefined) {
  render(result.document);
} else {
  showDiagnostics(result.diagnostics);
}
```

## First supported profile

The vertical slice recognizes `Accordion`, `Alert`, `Box`, `Button`, `Checkbox`, `Composition`,
`Form`, `Grid`, `Heading`, `Icon`, `Link`, `MultiSelect`, `RadioGroup`, `Select`, `Stack`, `Text`, `TextArea`,
and `TextField`. It validates JSON safety, the contract/profile version,
required metadata, node structure, stable unique IDs, component support, and catalog-declared
property types before producing any IR.

The current compiler and renderer are bound to the enum-backed `unifold-core@1.0.0` catalog.
Unknown names and versions fail with `InvalidCatalog` diagnostics at `/catalog/name` and
`/catalog/version`; they cannot silently run against the core renderer.

The required `@unislang/unifold-jsonui` dependency owns the exact upstream pin, support matrix,
bounded compatibility scan, and unsupported-feature diagnostics. It depends only on public
contracts. The compiler records the upstream revision in `UnifoldIrSource`; neither package imports
React or the upstream JsonUI store.

Compilation is deterministic:

- nodes are normalized and keyed by ID;
- render order remains explicit and independent from object key order;
- component properties and keyed records are canonicalized;
- unknown properties, invalid enum values, unsafe URLs, malformed choice options, and invalid string arrays are
  rejected with data-only diagnostics;
- enum-backed catalog constraints reject duplicate option values and scalar or array selections
  absent from the declared option list at exact JSON Pointer paths;
- every node receives a JSON Pointer source location;
- declared stores are canonicalized by ID, and schema-compatible control bindings become typed IR
  `binding` records;
- an optional `SemanticGraph` is validated against the authoritative contracts schema, canonicalized,
  and preserved in IR for the semantic compiler; malformed graphs produce exact `/semantics/...`
  diagnostics and no partial document;
- invalid input returns bounded data-only diagnostics and no partial document.

Store validation uses Draft 2020-12 schema compilation, semantic adapter-version ranges, local-only
references, resource bounds, and catalog value-property compatibility. It never loads domain data;
trusted adapter input is validated separately before application mount.

The compiler has no DOM, React, state, effect, or network dependency. Catalog resolvers expand the
supported component vocabulary without moving validation or JsonUI interpretation into renderers.

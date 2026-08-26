# `@unislang/unifold-renderer-dom`

Renders normalized Unifold IR into explicitly registered custom elements.

```ts
const controller = renderIrDocument(ir, document.querySelector("#app")!);
controller.update(nextIr);
controller.dispose();
```

Bindings are allow-listed by `@unislang/unifold-catalog`. Property-only IR
updates retain every element instance and assign values only to changed nodes.
Structural updates use stable node IDs to insert, remove, replace, reparent, and reorder only the
affected subtree. Unchanged hosts and descendants keep DOM identity and focus. Replacing the root ID
is the only operation that remounts the document.

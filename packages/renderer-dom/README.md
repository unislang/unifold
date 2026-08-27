# `@unislang/unifold-renderer-dom`

Renders normalized Unifold IR into explicitly registered custom elements.

```ts
const controller = renderIrDocument(ir, document.querySelector("#app")!);
controller.update(nextIr);
const focusStatus = await controller.restoreFocus("save");
controller.dispose();
```

Bindings are allow-listed by `@unislang/unifold-catalog`. Property-only IR
updates retain every element instance and assign values only to changed nodes.
Structural updates use stable node IDs to insert, remove, replace, reparent, and reorder only the
affected subtree. Unchanged hosts and descendants keep DOM identity and focus. Replacing the root ID
is the only operation that remounts the document.

`restoreFocus` returns `FocusRestoreStatus.Focused` only when the requested host still owns a
connected, enabled, visible target and deepest composed DOM focus confirms that the native focus
operation succeeded. Missing or unavailable targets return `NotFocused`. With pending element
registration enabled, settlement waits for an accepted definition and its update promises; focus
is not stolen if the user moves elsewhere while that work is pending.

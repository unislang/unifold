import assert from "node:assert/strict";
import test from "node:test";

import { findImportedBindingReexports } from "./import-reexports.mjs";

test("reports imported bindings exported by the importing module", () => {
  const source = [
    'import widget, { defineWidget as defineLocal } from "owner";',
    "export { defineLocal };",
    "export default widget;"
  ].join("\n");
  assert.deepEqual(findImportedBindingReexports(source), [
    { importedName: "defineLocal", name: "defineLocal" },
    { importedName: "widget", name: "default" }
  ]);
});

test("allows owned exports and direct package export maps", () => {
  const source = [
    'import "theme.css";',
    'import { defineWidget } from "owner";',
    "export function installWidget() { return defineWidget(); }",
    'export { publicWidget } from "owner";'
  ].join("\n");
  assert.deepEqual(findImportedBindingReexports(source), []);
});

import assert from "node:assert/strict";
import test from "node:test";

import { previewConfiguration } from "./preview-lifecycle.mjs";

test("creates a strict isolated host-parity preview configuration", () => {
  assert.deepEqual(previewConfiguration("C:/host-parity", 4177), {
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 4177, strictPort: true },
    root: "C:/host-parity"
  });
});

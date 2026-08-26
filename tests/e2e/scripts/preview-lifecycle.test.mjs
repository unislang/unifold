import assert from "node:assert/strict";
import test from "node:test";

import { previewConfiguration } from "./preview-lifecycle.mjs";

test("creates a strict isolated reference preview configuration", () => {
  assert.deepEqual(previewConfiguration("C:/reference", 4176), {
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 4176, strictPort: true },
    root: "C:/reference"
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { previewConfiguration } from "./preview-lifecycle.mjs";

test("creates a strict isolated preview configuration", () => {
  assert.deepEqual(previewConfiguration("C:/fixture", 4175), {
    configFile: false,
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 4175, strictPort: true },
    root: "C:/fixture"
  });
});

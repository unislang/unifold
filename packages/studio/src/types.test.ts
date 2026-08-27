import { expect, it } from "vitest";

import { StudioDiagnosticCode, StudioExportStatus, StudioSessionState } from "./types.js";

it("publishes closed enum-backed Studio states and outcomes", () => {
  expect(Object.values(StudioSessionState)).toEqual([
    "applied",
    "applying",
    "disposed",
    "failed",
    "generating",
    "idle",
    "preview-ready",
    "review-required"
  ]);
  expect(StudioExportStatus.Exported).toBe("exported");
  expect(StudioDiagnosticCode.StaleResult).toBe("stale-result");
});

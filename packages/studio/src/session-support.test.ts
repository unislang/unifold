import { expect, it } from "vitest";

import {
  jsonObject,
  proposalRequest,
  safeMessage,
  sameDocument,
  unavailableExport
} from "./session-support.js";
import { StudioDiagnosticCode, StudioExportStatus } from "./types.js";

it("builds bounded session support values without leaking errors", () => {
  const controller = new AbortController();
  expect(proposalRequest({}, { prompt: "Change" }, controller.signal)).toMatchObject({
    prompt: "Change",
    signal: controller.signal
  });
  expect(jsonObject([])).toBeUndefined();
  expect(jsonObject({ safe: true })).toEqual({ safe: true });
  const abort = new DOMException("private detail", "AbortError");
  expect(safeMessage(abort, StudioDiagnosticCode.ProposalFailed)).not.toContain("private detail");
});

it("compares canonical documents and creates unavailable export results", () => {
  expect(sameDocument({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true);
  expect(unavailableExport(StudioDiagnosticCode.ExportFailed)).toMatchObject({
    diagnostics: [{ code: StudioDiagnosticCode.ExportFailed }],
    status: StudioExportStatus.Unavailable
  });
});

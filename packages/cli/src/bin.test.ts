import { pathToFileURL } from "node:url";

import { expect, it, vi } from "vitest";

import { isUnifoldCliEntry, runUnifoldCliMain } from "./bin.js";

it("writes failures to stderr and returns a non-zero exit code", async () => {
  const stderr = { write: vi.fn(() => true) };
  const stdout = { write: vi.fn(() => true) };
  await expect(runUnifoldCliMain(["unknown"], { stderr, stdout })).resolves.toBe(1);
  expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining("invocation-invalid"));
  expect(stdout.write).not.toHaveBeenCalled();
});

it("identifies only the physical executable module", async () => {
  const moduleUrl = pathToFileURL(import.meta.filename).href;
  await expect(isUnifoldCliEntry(moduleUrl, import.meta.filename)).resolves.toBe(true);
  await expect(isUnifoldCliEntry("file:///missing.js", undefined)).resolves.toBe(false);
});

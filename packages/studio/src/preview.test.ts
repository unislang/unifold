// @vitest-environment happy-dom
import { beforeAll, expect, it, vi } from "vitest";
import { defineUnifoldElements, type MountUnifoldApplicationOptions } from "@unislang/unifold";

import { studioDocument } from "./studio.test-data.js";
import { createUnifoldStudioPreview, StudioPreviewError } from "./preview.js";

beforeAll(() => {
  defineUnifoldElements();
});

it("mounts and disposes an isolated application with external effects disabled", async () => {
  const container = document.createElement("div");
  const preview = createUnifoldStudioPreview(container);
  const handle = await preview.open(studioDocument());
  expect(container.querySelector("unifold-text-field")).not.toBeNull();
  handle.dispose();
  expect(container.querySelector("unifold-text-field")).toBeNull();
});

it("returns a stable preview error for an invalid candidate", () => {
  const preview = createUnifoldStudioPreview(document.createElement("div"));
  expect(() => preview.open({ invalid: true })).toThrow(StudioPreviewError);
});

it("does not read or forward host effect and callback ports", async () => {
  const accessed = vi.fn(() => {
    throw new Error("unsafe option accessed");
  });
  const preview = createUnifoldStudioPreview(
    document.createElement("div"),
    dangerousOptions(accessed)
  );
  const handle = await preview.open(studioDocument());
  expect(accessed).not.toHaveBeenCalled();
  handle.dispose();
});

function dangerousOptions(accessed: () => never): MountUnifoldApplicationOptions {
  return Object.defineProperties(
    {},
    Object.fromEntries(
      ["machineCommands", "machineGuards", "renderer", "runtime", "storeAdapters"].map((name) => [
        name,
        { enumerable: true, get: accessed }
      ])
    )
  ) as MountUnifoldApplicationOptions;
}

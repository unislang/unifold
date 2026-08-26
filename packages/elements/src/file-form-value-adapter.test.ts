// @vitest-environment happy-dom
import type { FileMetadata } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { createFileFormValueAdapter } from "./file-form-value-adapter.js";

it("projects only live Files and restores exact metadata without fabricating handles", () => {
  const live = new File(["private bytes"], "secret.pdf", { type: "application/pdf" });
  const value = [metadata("00000000-0000-4000-8000-000000000001", live)];
  const prepareRestore = vi.fn();
  const adapter = createFileFormValueAdapter(() => [live], prepareRestore);
  const projected = adapter.project(value, "attachments");
  expect(projected.submission).toBeInstanceOf(FormData);
  expect((projected.submission as FormData).getAll("attachments")).toEqual([live]);
  expect(projected.state).not.toContain(live.name);
  expect(adapter.restore(projected.state)).toEqual(value);
  expect(
    adapter.restore('[{"id":"secret.pdf","size":13,"type":"application/pdf"}]')
  ).toBeUndefined();
  expect(adapter.isValueMissing(value)).toBe(false);
  expect(
    createFileFormValueAdapter(() => [], vi.fn()).project(value, "attachments").submission
  ).toBeNull();
  adapter.prepareRestore?.(value);
  expect(prepareRestore).toHaveBeenCalledOnce();
});

function metadata(id: string, file: File): FileMetadata {
  return { id, size: file.size, type: file.type };
}

// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { sameFileMetadata, selectBoundedFiles } from "./file-selection.js";

it("accepts matching bounded files and emits exact JSON-safe metadata", () => {
  const pdf = file("invoice.pdf", 12, "application/pdf", 10);
  const image = file("photo.PNG", 8, "image/png", 11);
  const rejected = file("script.js", 4, "text/javascript", 12);
  const selection = selectBoundedFiles(
    [pdf, image, rejected],
    ".pdf,image/*",
    100,
    true,
    opaqueIds()
  );
  expect(selection.files).toEqual([pdf, image]);
  expect(selection.metadata).toEqual([
    { id: opaqueId(0), size: 12, type: "application/pdf" },
    { id: opaqueId(1), size: 8, type: "image/png" }
  ]);
  expect(selection.rejectedCount).toBe(1);
});

it("enforces one-file, byte, safe-name, and exact media-type boundaries", () => {
  const selection = selectBoundedFiles(
    [
      file("first.txt", 4, "text/plain", 1),
      file("second.txt", 4, "text/plain", 2),
      file("large.txt", 11, "text/plain", 3),
      file("../secret.txt", 1, "text/plain", 4)
    ],
    "text/plain",
    10,
    false
  );
  expect(selection.metadata).toEqual([{ id: expect.any(String), size: 4, type: "text/plain" }]);
  expect(selection.rejectedCount).toBe(3);
});

it("compares controlled metadata without relying on object identity", () => {
  const selected = selectBoundedFiles([file("a.txt", 1, "text/plain", 2)], "", 10, false);
  const metadata = selected.metadata[0];
  if (metadata === undefined) throw new Error("Selected metadata is missing.");
  expect(
    sameFileMetadata(selected.metadata, [
      {
        id: metadata.id,
        size: metadata.size,
        type: metadata.type
      }
    ])
  ).toBe(true);
  expect(sameFileMetadata(selected.metadata, [])).toBe(false);
});

function file(name: string, size: number, type: string, lastModified: number): File {
  return new File([new Uint8Array(size)], name, { lastModified, type });
}

function opaqueIds(): () => string {
  let index = 0;
  return () => opaqueId(index++);
}

function opaqueId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

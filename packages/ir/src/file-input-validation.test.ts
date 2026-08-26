import {
  CatalogConstraintKind,
  MAXIMUM_FILE_COUNT,
  type CatalogFileInputDataConstraint
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { isFileMetadataList, validateFileInputDataConstraint } from "./file-input-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogFileInputDataConstraint = {
  kind: CatalogConstraintKind.FileInputData,
  maximumFileBytesProperty: "maximumFileBytes",
  multipleProperty: "multiple",
  valueProperty: "value"
};

it("accepts exact bounded file metadata without bytes or paths", () => {
  expect(isFileMetadataList([metadata(0, 2_048, "application/pdf")])).toBe(true);
  expect(validate([metadata(0, 2_048, "application/pdf")], false)).toEqual([]);
});

it("rejects identifying fields, malformed metadata, duplicate IDs, and oversized lists", () => {
  expect(isFileMetadataList("files")).toBe(false);
  expect(isFileMetadataList([{ id: "invoice.pdf", size: 1, type: "text/plain" }])).toBe(false);
  expect(isFileMetadataList([{ ...metadata(0, 1, "text/plain"), name: "secret.txt" }])).toBe(false);
  expect(isFileMetadataList([{ ...metadata(0, 1, "text/plain"), lastModified: 1 }])).toBe(false);
  expect(isFileMetadataList([metadata(0, -1, "text/plain")])).toBe(false);
  expect(isFileMetadataList([metadata(0, 1, "not a type")])).toBe(false);
  expect(isFileMetadataList([{ ...metadata(0, 1, "text/plain"), bytes: "secret" }])).toBe(false);
  expect(isFileMetadataList([metadata(0, 1, "text/plain"), metadata(0, 2, "text/plain")])).toBe(
    false
  );
  expect(
    isFileMetadataList(
      Array.from({ length: MAXIMUM_FILE_COUNT + 1 }, (_, index) => metadataAt(index))
    )
  ).toBe(false);
});

it("reports exact count and size constraint paths", () => {
  const diagnostics = validate(
    [metadata(0, 1, "application/pdf"), metadata(1, 11, "application/pdf")],
    false,
    10
  );
  expect(diagnostics.map(({ code, nodeId, path }) => ({ code, nodeId, path }))).toEqual([
    { code: DiagnosticCode.InvalidFileCount, nodeId: "files", path: "/view/value" },
    { code: DiagnosticCode.FileTooLarge, nodeId: "files", path: "/view/value/1/size" }
  ]);
});

it("ignores unrelated constraints and malformed cross-properties", () => {
  const diagnostics: CompilerDiagnostic[] = [];
  validateFileInputDataConstraint(
    { maximumFileBytes: 10, multiple: true, value: [] },
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 },
    "/view",
    diagnostics
  );
  validateFileInputDataConstraint(
    { maximumFileBytes: "large", multiple: true, value: [] },
    constraint,
    "/view",
    diagnostics
  );
  expect(diagnostics).toEqual([]);
});

function validate(
  value: unknown,
  multiple: unknown,
  maximumFileBytes: unknown = 10_000
): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateFileInputDataConstraint(
    { id: "files", maximumFileBytes, multiple, value },
    constraint,
    "/view",
    diagnostics
  );
  return diagnostics;
}

function metadata(index: number, size: number, type: string) {
  return { id: opaqueId(index), size, type };
}

function metadataAt(index: number) {
  return metadata(index, index, "text/plain");
}

function opaqueId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

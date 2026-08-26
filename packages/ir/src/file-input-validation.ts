import {
  CatalogConstraintKind,
  FileMetadataProperty,
  MAXIMUM_FILE_COUNT,
  MAXIMUM_FILE_ID_LENGTH,
  type CatalogConstraintDescriptor,
  type CatalogFileInputDataConstraint,
  type FileMetadata
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

const metadataKeys: ReadonlySet<string> = new Set(Object.values(FileMetadataProperty));
const opaqueIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function isFileMetadataList(value: unknown): value is readonly FileMetadata[] {
  if (!Array.isArray(value)) return false;
  return isBoundedMetadata(value);
}

function isBoundedMetadata(value: readonly unknown[]): value is readonly FileMetadata[] {
  return [
    value.length <= MAXIMUM_FILE_COUNT,
    value.every(isFileMetadata),
    hasUniqueIds(value)
  ].every(Boolean);
}

export function validateFileInputDataConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.FileInputData) return;
  validateFileInputValue(node, constraint, path, diagnostics);
}

function validateFileInputValue(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogFileInputDataConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const input = readFileInput(node, constraint);
  if (input === undefined) return;
  reportFileCount(input.value, input.multiple, constraint, path, nodeId(node), diagnostics);
  reportOversizedFiles(
    input.value,
    input.maximumBytes,
    constraint,
    path,
    nodeId(node),
    diagnostics
  );
}

interface ValidFileInput {
  readonly maximumBytes: number;
  readonly multiple: boolean;
  readonly value: readonly FileMetadata[];
}

function readFileInput(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogFileInputDataConstraint
): ValidFileInput | undefined {
  const value = node[constraint.valueProperty];
  const maximumBytes = node[constraint.maximumFileBytesProperty];
  const multiple = node[constraint.multipleProperty];
  const valid = [
    isFileMetadataList(value),
    isPositiveSafeInteger(maximumBytes),
    typeof multiple === "boolean"
  ].every(Boolean);
  if (!valid) return undefined;
  return {
    maximumBytes: maximumBytes as number,
    multiple: multiple as boolean,
    value: value as readonly FileMetadata[]
  };
}

function isFileMetadata(value: unknown): value is FileMetadata {
  if (!isPlainObject(value)) return false;
  return [
    isOpaqueFileId(value[FileMetadataProperty.Id]),
    isNonNegativeSafeInteger(value[FileMetadataProperty.Size]),
    isMediaType(value[FileMetadataProperty.Type]),
    Object.keys(value).every((key) => metadataKeys.has(key))
  ].every(Boolean);
}

function isOpaqueFileId(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.length === MAXIMUM_FILE_ID_LENGTH &&
    opaqueIdPattern.test(value)
  );
}

function hasUniqueIds(value: readonly unknown[]): boolean {
  const ids = value.map(metadataId);
  return new Set(ids).size === ids.length;
}

function metadataId(value: unknown): unknown {
  return isPlainObject(value) ? value[FileMetadataProperty.Id] : undefined;
}

function isMediaType(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.length > 255) return false;
  return emptyOrMediaType(value);
}

function emptyOrMediaType(value: string): boolean {
  if (value === "") return true;
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/iu.test(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function reportFileCount(
  value: readonly FileMetadata[],
  multiple: boolean,
  constraint: CatalogFileInputDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const maximum = multiple ? MAXIMUM_FILE_COUNT : 1;
  if (value.length <= maximum) return;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidFileCount,
      `FileInput accepts at most ${maximum} selected ${fileNoun(maximum)}.`,
      `${path}/${constraint.valueProperty}`,
      id
    )
  );
}

function fileNoun(maximum: number): string {
  return maximum === 1 ? "file" : "files";
}

function reportOversizedFiles(
  value: readonly FileMetadata[],
  maximumBytes: number,
  constraint: CatalogFileInputDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  value.forEach((file, index) => {
    if (file.size <= maximumBytes) return;
    diagnostics.push(
      errorDiagnostic(
        DiagnosticCode.FileTooLarge,
        `Selected file exceeds the ${maximumBytes}-byte FileInput limit.`,
        `${path}/${constraint.valueProperty}/${index}/size`,
        id
      )
    );
  });
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}

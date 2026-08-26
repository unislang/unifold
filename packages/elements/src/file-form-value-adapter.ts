import {
  FileMetadataProperty,
  MAXIMUM_FILE_COUNT,
  MAXIMUM_FILE_ID_LENGTH,
  type FileMetadata
} from "@unislang/unifold-catalog";

import type { NativeFormValueAdapter } from "./native-form-control-controller.js";

const MAXIMUM_FORM_STATE_LENGTH = 65_536;
const fileMetadataKeys: ReadonlySet<string> = new Set(Object.values(FileMetadataProperty));
const opaqueIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function createFileFormValueAdapter(
  filesFor: (value: readonly FileMetadata[]) => readonly File[],
  prepareRestore: () => void
): NativeFormValueAdapter<readonly FileMetadata[]> {
  return {
    clone: cloneMetadata,
    equals: equalMetadata,
    isValueMissing: (value) => filesFor(value).length !== value.length || value.length === 0,
    prepareRestore,
    project: (value, name) => ({
      state: JSON.stringify(value),
      submission: repeatedFiles(name, value, filesFor(value))
    }),
    restore: restoreMetadata
  };
}

function repeatedFiles(
  name: string,
  metadata: readonly FileMetadata[],
  files: readonly File[]
): FormData | null {
  if (!hasCompleteFileSelection(name, metadata, files)) return null;
  const data = new FormData();
  files.forEach((file) => data.append(name, file));
  return data;
}

function hasCompleteFileSelection(
  name: string,
  metadata: readonly FileMetadata[],
  files: readonly File[]
): boolean {
  return name.length > 0 && metadata.length > 0 && files.length === metadata.length;
}

function restoreMetadata(state: string): readonly FileMetadata[] | undefined {
  const value = parseState(state);
  return isFileMetadataList(value) ? cloneMetadata(value) : undefined;
}

function isFileMetadataList(value: unknown): value is readonly FileMetadata[] {
  if (!Array.isArray(value)) return false;
  const ids = value.map(metadataId);
  return [
    value.length <= MAXIMUM_FILE_COUNT,
    value.every(isFileMetadata),
    new Set(ids).size === ids.length
  ].every(Boolean);
}

function isFileMetadata(value: unknown): value is FileMetadata {
  if (!isPlainRecord(value)) return false;
  return [
    isOpaqueFileId(value[FileMetadataProperty.Id]),
    isFileSize(value[FileMetadataProperty.Size]),
    isMediaType(value[FileMetadataProperty.Type]),
    Object.keys(value).every((key) => fileMetadataKeys.has(key))
  ].every(Boolean);
}

function metadataId(value: unknown): unknown {
  return isPlainRecord(value) ? value[FileMetadataProperty.Id] : undefined;
}

function isOpaqueFileId(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.length === MAXIMUM_FILE_ID_LENGTH &&
    opaqueIdPattern.test(value)
  );
}

function isFileSize(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isMediaType(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return boundedMediaType(value);
}

function boundedMediaType(value: string): boolean {
  if (value.length > 255) return false;
  return value === "" || /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/iu.test(value);
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (![value !== null, typeof value === "object", !Array.isArray(value)].every(Boolean))
    return false;
  return Object.getPrototypeOf(value) === Object.prototype;
}

function parseState(state: string): unknown {
  if (state.length > MAXIMUM_FORM_STATE_LENGTH) return undefined;
  try {
    return JSON.parse(state) as unknown;
  } catch {
    return undefined;
  }
}

function cloneMetadata(value: readonly FileMetadata[]): readonly FileMetadata[] {
  return Object.freeze(value.map((item) => Object.freeze({ ...item })));
}

function equalMetadata(left: readonly FileMetadata[], right: readonly FileMetadata[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => sameMetadata(value, right[index]))
  );
}

function sameMetadata(left: FileMetadata, right: FileMetadata | undefined): boolean {
  if (right === undefined) return false;
  return [left.id === right.id, left.size === right.size, left.type === right.type].every(Boolean);
}

import {
  MAXIMUM_FILE_COUNT,
  MAXIMUM_FILE_NAME_LENGTH,
  type FileMetadata
} from "@unislang/unifold-catalog";

interface BoundedFileSelection {
  readonly files: readonly File[];
  readonly metadata: readonly FileMetadata[];
  readonly rejectedCount: number;
}

interface MutableFileSelection {
  readonly files: File[];
  rejectedCount: number;
}

type FileIdentifierFactory = () => string;

export function selectBoundedFiles(
  candidates: readonly File[],
  accept: string,
  maximumFileBytes: number,
  multiple: boolean,
  createId: FileIdentifierFactory = createOpaqueFileId
): BoundedFileSelection {
  const maximumCount = selectionLimit(multiple);
  const selection: MutableFileSelection = { files: [], rejectedCount: 0 };
  candidates.forEach((file) =>
    addCandidate(selection, file, accept, maximumFileBytes, maximumCount)
  );
  return {
    files: Object.freeze([...selection.files]),
    metadata: Object.freeze(selection.files.map((file) => fileMetadata(file, createId()))),
    rejectedCount: selection.rejectedCount
  };
}

function addCandidate(
  selection: MutableFileSelection,
  file: File,
  accept: string,
  maximumFileBytes: number,
  maximumCount: number
): void {
  if (canAccept(file, accept, maximumFileBytes, selection.files.length, maximumCount)) {
    selection.files.push(file);
    return;
  }
  selection.rejectedCount += 1;
}

export function sameFileMetadata(
  left: readonly FileMetadata[],
  right: readonly FileMetadata[]
): boolean {
  if (left.length !== right.length) return false;
  return left.every((file, index) => sameFile(file, right[index]));
}

function canAccept(
  file: File,
  accept: string,
  maximumFileBytes: number,
  acceptedCount: number,
  maximumCount: number
): boolean {
  return [
    acceptedCount < maximumCount,
    safeFile(file),
    file.size <= maximumFileBytes,
    matchesAccept(file, accept)
  ].every(Boolean);
}

function safeFile(file: File): boolean {
  return [
    file.name.trim().length > 0,
    file.name.length <= MAXIMUM_FILE_NAME_LENGTH,
    !/[\\/\0]/u.test(file.name),
    Number.isSafeInteger(file.size)
  ].every(Boolean);
}

function matchesAccept(file: File, accept: string): boolean {
  const tokens = acceptTokens(accept);
  return tokens.length === 0 || tokens.some((token) => matchesToken(file, token));
}

function acceptTokens(accept: string): readonly string[] {
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

function matchesToken(file: File, token: string): boolean {
  if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token);
  if (token.endsWith("/*")) return file.type.toLowerCase().startsWith(token.slice(0, -1));
  return file.type.toLowerCase() === token;
}

function fileMetadata(file: File, id: string): FileMetadata {
  return Object.freeze({
    id,
    size: file.size,
    type: file.type.toLowerCase()
  });
}

function sameFile(left: FileMetadata, right: FileMetadata | undefined): boolean {
  if (right === undefined) return false;
  return [left.id === right.id, left.size === right.size, left.type === right.type].every(Boolean);
}

function selectionLimit(multiple: boolean): number {
  return multiple ? MAXIMUM_FILE_COUNT : 1;
}

function createOpaqueFileId(): string {
  return globalThis.crypto.randomUUID();
}

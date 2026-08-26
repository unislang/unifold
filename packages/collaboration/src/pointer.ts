import { CollaborationPatchOperationType, type CollaborationPatchOperation } from "./types.js";

const unsafeTokens = new Set(["__proto__", "constructor", "prototype"]);

export function decodePointer(path: string): readonly string[] | undefined {
  if (!validPointerText(path)) return undefined;
  const encoded = path.slice(1).split("/");
  return decodeTokens(encoded);
}

function decodeTokens(encoded: readonly string[]): readonly string[] | undefined {
  if (encoded.length > 64) return undefined;
  const decoded = encoded.map(decodeToken);
  if (decoded.some((token) => token === undefined)) return undefined;
  return decoded as readonly string[];
}

export function isSafePatchPointer(path: string): boolean {
  const tokens = decodePointer(path);
  if (tokens === undefined) return false;
  return tokens.every((token) => !unsafeTokens.has(token));
}

export function operationPaths(operation: CollaborationPatchOperation): readonly string[] {
  return operation.from === undefined ? [operation.path] : [operation.path, operation.from];
}

export function changedPaths(
  operations: readonly CollaborationPatchOperation[]
): readonly string[] {
  return [...new Set(operations.filter(isChange).flatMap(operationPaths))].sort();
}

export function targetsFrameworkOwnedIdentity(path: string): boolean {
  const tokens = decodePointer(path);
  if (tokens === undefined) return true;
  const last = tokens.at(-1);
  return path === "/revision" || last === "id";
}

export function pointersOverlap(left: string, right: string): boolean {
  const leftTokens = decodePointer(left);
  const rightTokens = decodePointer(right);
  if (leftTokens === undefined || rightTokens === undefined) return true;
  const shared = Math.min(leftTokens.length, rightTokens.length);
  return leftTokens.slice(0, shared).every((token, index) => token === rightTokens[index]);
}

export function arrayParent(path: string): string | undefined {
  const tokens = decodePointer(path);
  if (tokens === undefined) return path;
  const last = tokens.at(-1);
  if (!isArrayIndex(last)) return undefined;
  return `/${tokens.slice(0, -1).map(encodeToken).join("/")}`;
}

function validPointerText(path: string): boolean {
  return [path.length > 0, path.length <= 1_024, path.startsWith("/")].every(Boolean);
}

function isArrayIndex(value: string | undefined): boolean {
  return value === "-" || /^\d+$/u.test(value ?? "");
}

function isChange(operation: CollaborationPatchOperation): boolean {
  return operation.op !== CollaborationPatchOperationType.Test;
}

function decodeToken(token: string): string | undefined {
  if (/~(?:[^01]|$)/u.test(token)) return undefined;
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function encodeToken(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

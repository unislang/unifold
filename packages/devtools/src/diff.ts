import type { JsonObject } from "@unislang/unifold-contracts";
import canonicalize from "canonicalize";
import { createPatch } from "rfc6902";

import type { DevtoolsDocumentDiff, DevtoolsPatchOperation } from "./types.js";

export async function documentFingerprint(document: JsonObject): Promise<string> {
  const value = canonicalize(document);
  if (value === undefined) throw new TypeError("Devtools documents must contain canonical JSON.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), hexadecimalByte).join("");
}

export async function createDocumentDiff(
  before: JsonObject,
  after: JsonObject
): Promise<DevtoolsDocumentDiff> {
  const operations = createPatch(structuredClone(before), structuredClone(after));
  return Object.freeze({
    afterFingerprint: await documentFingerprint(after),
    beforeFingerprint: await documentFingerprint(before),
    operations: Object.freeze(
      operations.map((operation) => Object.freeze(operation as DevtoolsPatchOperation))
    )
  });
}

function hexadecimalByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

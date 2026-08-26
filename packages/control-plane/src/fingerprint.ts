import type { JsonValue } from "@unislang/unifold-contracts";
import canonicalize from "canonicalize";

import type { ControlPlaneFingerprintPort } from "./ports.js";

export const controlPlaneFingerprint: ControlPlaneFingerprintPort = Object.freeze({
  fingerprint
});

async function fingerprint(value: JsonValue): Promise<string> {
  const canonical = canonicalize(value);
  if (canonical === undefined) throw new Error("The request cannot be represented as JSON.");
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical)
  );
  return Array.from(new Uint8Array(digest), hexadecimalByte).join("");
}

function hexadecimalByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

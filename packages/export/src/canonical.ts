import canonicalize from "canonicalize";

export function canonicalJson(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) throw new Error("The value cannot be represented as canonical JSON.");
  return result;
}

export async function fingerprintJson(value: unknown): Promise<string> {
  return fingerprintText(canonicalJson(value));
}

export async function fingerprintText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), hexadecimalByte).join("");
}

function hexadecimalByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

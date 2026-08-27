import canonicalize from "canonicalize";

export async function uiModuleIntegrity(value: unknown): Promise<string> {
  const canonical = safeCanonicalJson(value);
  if (canonical === undefined) throw new TypeError("The UiModule cannot be represented as JSON.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return `sha256-${base64Url(new Uint8Array(digest))}`;
}

function safeCanonicalJson(value: unknown): string | undefined {
  try {
    return canonicalize(value);
  } catch {
    throw new TypeError("The UiModule cannot be represented as canonical JSON.");
  }
}

function base64Url(value: Uint8Array): string {
  const binary = String.fromCharCode(...value);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

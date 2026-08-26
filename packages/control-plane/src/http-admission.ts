import type { ControlPlaneClockPort } from "./ports.js";
import type { ControlPlaneWireRequest } from "./transport-validation.js";

export interface ControlPlaneHttpAdmissionPort {
  admit(request: Request, wireRequest: ControlPlaneWireRequest): Promise<boolean>;
}

export interface ControlPlaneHttpSessionRecord {
  readonly csrfToken: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
}

export interface ReferenceControlPlaneHttpAdmissionOptions {
  readonly allowedOrigins: readonly string[];
  readonly clock: ControlPlaneClockPort;
  readonly cookieName?: string;
  readonly csrfHeaderName?: string;
  readonly sessions: Readonly<Record<string, ControlPlaneHttpSessionRecord>>;
}

const defaultCookieName = "__Host-unifold-session";
const defaultCsrfHeaderName = "x-unifold-csrf";

export function createReferenceControlPlaneHttpAdmission(
  options: ReferenceControlPlaneHttpAdmissionOptions
): ControlPlaneHttpAdmissionPort {
  const origins = configuredOrigins(options.allowedOrigins);
  const cookieName = configuredTokenName(options.cookieName ?? defaultCookieName, "cookie");
  const headerName = configuredTokenName(options.csrfHeaderName ?? defaultCsrfHeaderName, "header");
  const sessions = configuredSessions(options.sessions);
  return Object.freeze({
    async admit(request: Request, wireRequest: ControlPlaneWireRequest): Promise<boolean> {
      const now = parsedTimestamp(options.clock.now());
      const origin = request.headers.get("origin");
      const sessionToken = exactCookie(request.headers.get("cookie"), cookieName);
      const record = sessions.get(sessionToken ?? "");
      return admissionAllowed({
        csrfToken: request.headers.get(headerName),
        method: request.method,
        now,
        origin,
        origins,
        record,
        sessionToken,
        wireSessionToken: wireRequest.sessionToken
      });
    }
  });
}

interface AdmissionValues {
  readonly csrfToken: string | null;
  readonly method: string;
  readonly now: number;
  readonly origin: string | null;
  readonly origins: ReadonlySet<string>;
  readonly record: ControlPlaneHttpSessionRecord | undefined;
  readonly sessionToken: string | undefined;
  readonly wireSessionToken: string;
}

function admissionAllowed(values: AdmissionValues): boolean {
  return [
    values.method === "POST",
    values.origin !== null && values.origins.has(values.origin),
    values.sessionToken === values.wireSessionToken,
    activeRecord(values.record, values.now),
    validCsrf(values.csrfToken, values.record)
  ].every(Boolean);
}

function validCsrf(
  csrfToken: string | null,
  record: ControlPlaneHttpSessionRecord | undefined
): boolean {
  if (csrfToken === null || record === undefined) return false;
  return constantTimeTextEqual(csrfToken, record.csrfToken);
}

function configuredOrigins(values: readonly string[]): ReadonlySet<string> {
  if (values.length === 0) throw new TypeError("At least one HTTP admission origin is required.");
  const origins = new Set(values.map(canonicalOrigin));
  if (origins.size !== values.length) throw new TypeError("HTTP admission origins must be unique.");
  return origins;
}

function canonicalOrigin(value: string): string {
  const parsed = parsedUrl(value);
  const invalid = [parsed.origin !== value, !["http:", "https:"].includes(parsed.protocol)];
  if (invalid.some(Boolean))
    throw new TypeError("HTTP admission origin must be an exact HTTP(S) origin.");
  return value;
}

function parsedUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new TypeError("HTTP admission origin is invalid.");
  }
}

function configuredTokenName(value: string, label: string): string {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/u.test(value)) {
    throw new TypeError(`HTTP admission ${label} name is invalid.`);
  }
  return value;
}

function configuredSessions(
  values: Readonly<Record<string, ControlPlaneHttpSessionRecord>>
): ReadonlyMap<string, ControlPlaneHttpSessionRecord> {
  return new Map(Object.entries(values).map(validatedSession));
}

function validatedSession(
  entry: readonly [string, ControlPlaneHttpSessionRecord]
): readonly [string, ControlPlaneHttpSessionRecord] {
  const [token, record] = entry;
  if (![validSecret(token), validSecret(record.csrfToken)].every(Boolean)) {
    throw new TypeError("HTTP admission session and CSRF tokens must be bounded nonempty text.");
  }
  parsedTimestamp(record.expiresAt);
  validateOptionalTimestamp(record.revokedAt);
  return [token, Object.freeze({ ...record })];
}

function validateOptionalTimestamp(value: string | undefined): void {
  if (value !== undefined) parsedTimestamp(value);
}

function validSecret(value: string): boolean {
  return [value.length >= 16, value.length <= 4096, [...value].every(nonWhitespaceCharacter)].every(
    Boolean
  );
}

function nonWhitespaceCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 32 && code !== 127;
}

function parsedTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError("HTTP admission timestamp is invalid.");
  return parsed;
}

function activeRecord(record: ControlPlaneHttpSessionRecord | undefined, now: number): boolean {
  if (record === undefined) return false;
  return [parsedTimestamp(record.expiresAt) > now, revocationActive(record.revokedAt, now)].every(
    Boolean
  );
}

function revocationActive(revokedAt: string | undefined, now: number): boolean {
  if (revokedAt === undefined) return true;
  return parsedTimestamp(revokedAt) > now;
}

function exactCookie(header: string | null, name: string): string | undefined {
  if (!validCookieHeader(header)) return undefined;
  return singleCookie(String(header), name);
}

function validCookieHeader(header: string | null): boolean {
  return header !== null && header.length <= 8192;
}

function singleCookie(header: string, name: string): string | undefined {
  const values = header.split(";").flatMap((part) => cookieValue(part.trim(), name));
  return values.length === 1 ? values[0] : undefined;
}

function cookieValue(part: string, name: string): readonly string[] {
  const separator = part.indexOf("=");
  const invalid = [separator < 1, part.slice(0, separator).trim() !== name];
  if (invalid.some(Boolean)) return [];
  const value = part.slice(separator + 1).trim();
  return value.length === 0 ? [] : [value];
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= byteAt(leftBytes, index) ^ byteAt(rightBytes, index);
  }
  return difference === 0;
}

function byteAt(bytes: Uint8Array, index: number): number {
  return bytes[index] ?? 0;
}

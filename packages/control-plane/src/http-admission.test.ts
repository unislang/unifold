import { expect, it } from "vitest";

import {
  createReferenceControlPlaneHttpAdmission,
  type ControlPlaneHttpSessionRecord
} from "./http-admission.js";
import type { ControlPlaneWireRequest } from "./transport-validation.js";
import { ControlPlaneOperation, ControlPlaneProtocolVersion } from "./types.js";

const sessionToken = "opaque-session-token-0001";
const csrfToken = "csrf-token-with-strong-entropy-0001";
const active: ControlPlaneHttpSessionRecord = {
  csrfToken,
  expiresAt: "2026-08-27T00:00:00.000Z"
};
const wireRequest = {
  correlationId: "correlation-1",
  objectId: "document-1",
  operation: ControlPlaneOperation.DocumentRead,
  protocolVersion: ControlPlaneProtocolVersion.Version1,
  requestId: "request-1",
  sessionToken
} as ControlPlaneWireRequest;

it("admits only an exact active cookie session, origin, and matching CSRF token", async () => {
  const admission = createAdmission({ [sessionToken]: active });
  await expect(admission.admit(request(), wireRequest)).resolves.toBe(true);
  await expect(
    admission.admit(request({ origin: "https://evil.example" }), wireRequest)
  ).resolves.toBe(false);
  await expect(
    admission.admit(request({ csrf: "wrong-token-with-enough-length" }), wireRequest)
  ).resolves.toBe(false);
  await expect(
    admission.admit(request(), { ...wireRequest, sessionToken: "another-session-token-0001" })
  ).resolves.toBe(false);
  await expect(
    admission.admit(request({ cookie: `${cookie()}; ${cookie()}` }), wireRequest)
  ).resolves.toBe(false);
});

it("denies expired and revoked sessions and validates configuration", async () => {
  const expired = createAdmission({
    [sessionToken]: { ...active, expiresAt: "2026-08-25T00:00:00.000Z" }
  });
  const revoked = createAdmission({
    [sessionToken]: { ...active, revokedAt: "2026-08-25T00:00:00.000Z" }
  });
  await expect(expired.admit(request(), wireRequest)).resolves.toBe(false);
  await expect(revoked.admit(request(), wireRequest)).resolves.toBe(false);
  expect(() =>
    createReferenceControlPlaneHttpAdmission({
      allowedOrigins: [],
      clock: { now: () => "invalid" },
      sessions: {}
    })
  ).toThrow(TypeError);
});

function createAdmission(sessions: Readonly<Record<string, ControlPlaneHttpSessionRecord>>) {
  return createReferenceControlPlaneHttpAdmission({
    allowedOrigins: ["https://control.example"],
    clock: { now: () => "2026-08-26T00:00:00.000Z" },
    sessions
  });
}

function request(overrides: { cookie?: string; csrf?: string; origin?: string } = {}): Request {
  const values = {
    cookie: cookie(),
    csrf: csrfToken,
    origin: "https://control.example",
    ...overrides
  };
  return new Request("https://control.example/v1/control-plane", {
    headers: {
      Cookie: values.cookie,
      Origin: values.origin,
      "X-Unifold-CSRF": values.csrf
    },
    method: "POST"
  });
}

function cookie(): string {
  return `__Host-unifold-session=${sessionToken}`;
}

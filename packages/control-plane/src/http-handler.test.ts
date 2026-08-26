import { expect, it, vi } from "vitest";

import { grant, metadata, referenceOptions } from "./control-plane.test-data.js";
import { createControlPlaneHttpHandler } from "./http-handler.js";
import { createReferenceControlPlaneHttpAdmission } from "./http-admission.js";
import { createReferenceControlPlane } from "./reference.js";
import type { ControlPlaneService } from "./service.js";
import {
  ControlPlaneCapability,
  ControlPlaneErrorCode,
  ControlPlaneOperation,
  ControlPlaneOperationStatus
} from "./types.js";

const endpoint = "https://control.example/v1/control-plane";

it("dispatches an exact JSON request and maps its service result to HTTP", async () => {
  const reference = createReferenceControlPlane(
    referenceOptions({ grants: [grant(ControlPlaneCapability.DocumentRead, "document-1")] })
  );
  const handler = createControlPlaneHttpHandler(reference.service);
  const response = await handler(
    post({
      ...metadata(ControlPlaneOperation.DocumentRead),
      objectId: "document-1"
    })
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({
    error: { code: ControlPlaneErrorCode.DocumentNotFound },
    status: ControlPlaneOperationStatus.NotFound
  });
});

it("rejects route, method, media type, malformed shape, and oversized bodies", async () => {
  const handler = createControlPlaneHttpHandler(stubService(), { maximumRequestBytes: 1024 });
  expect(
    await handler(new Request("https://control.example/wrong", { method: "POST" }))
  ).toMatchObject({ status: 404 });
  const method = await handler(new Request(endpoint));
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("POST");
  expect(await handler(new Request(endpoint, { method: "POST", body: "{}" }))).toMatchObject({
    status: 415
  });
  expect((await handler(post({ ...metadata(ControlPlaneOperation.DocumentRead) }))).status).toBe(
    400
  );
  expect((await handler(post({ padding: "x".repeat(1100) }))).status).toBe(413);
});

it("passes cancellation to effects and redacts unexpected service failures", async () => {
  const invokeEffect = vi.fn<ControlPlaneService["invokeEffect"]>(async (_request, signal) => {
    expect(signal).toBeInstanceOf(AbortSignal);
    throw new Error("private database message");
  });
  const handler = createControlPlaneHttpHandler({ ...stubService(), invokeEffect });
  const response = await handler(
    post({
      ...metadata(ControlPlaneOperation.EffectInvoke),
      effectId: "orders.submit",
      idempotencyKey: "effect-1",
      input: {},
      objectId: "document-1"
    })
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database message");
  expect(invokeEffect).toHaveBeenCalledOnce();
});

it("validates configured transport bounds", () => {
  expect(() => createControlPlaneHttpHandler(stubService(), { pathname: "relative" })).toThrow(
    TypeError
  );
  expect(() => createControlPlaneHttpHandler(stubService(), { maximumRequestBytes: 100 })).toThrow(
    RangeError
  );
});

it("enforces transport admission before dispatch and rejects other unsafe methods", async () => {
  const handler = secureHandler();
  const body = secureBody();
  const admitted = await handler(
    post(body, {
      Cookie: "__Host-unifold-session=opaque-session-token-0001",
      Origin: "https://control.example",
      "X-Unifold-CSRF": "csrf-token-with-strong-entropy-0001"
    })
  );
  expect(admitted.status).toBe(503);
  const denied = await handler(post(body, { Origin: "https://control.example" }));
  expect(denied.status).toBe(403);
  expect(await denied.json()).toMatchObject({
    error: { code: ControlPlaneErrorCode.AuthorizationDenied }
  });
});

it("rejects non-POST unsafe methods before secure transport admission", async () => {
  const handler = secureHandler();
  expect(
    (
      await handler(
        new Request(endpoint, {
          body: JSON.stringify(secureBody()),
          headers: { "Content-Type": "application/json" },
          method: "PUT"
        })
      )
    ).status
  ).toBe(405);
});

function secureHandler() {
  return createControlPlaneHttpHandler(stubService(), {
    admission: createReferenceControlPlaneHttpAdmission({
      allowedOrigins: ["https://control.example"],
      clock: { now: () => "2026-08-26T00:00:00.000Z" },
      sessions: {
        "opaque-session-token-0001": {
          csrfToken: "csrf-token-with-strong-entropy-0001",
          expiresAt: "2026-08-27T00:00:00.000Z"
        }
      }
    })
  });
}

function secureBody() {
  return {
    ...metadata(ControlPlaneOperation.DocumentRead),
    objectId: "document-1",
    sessionToken: "opaque-session-token-0001"
  };
}

function post(value: unknown, headers?: Readonly<Record<string, string>>): Request {
  return new Request(endpoint, {
    body: JSON.stringify(value),
    headers: { "Content-Type": "application/json", ...headers },
    method: "POST"
  });
}

function stubService(): ControlPlaneService {
  const unavailable = async () => ({ status: ControlPlaneOperationStatus.Unavailable as const });
  return {
    commitDocument: unavailable,
    createBackup: unavailable,
    invokeEffect: unavailable,
    readDocument: unavailable,
    restoreBackup: unavailable,
    resumeRealtime: unavailable
  };
}

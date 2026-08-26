import { expect, it, vi } from "vitest";

import { document, grant, metadata, referenceOptions } from "./control-plane.test-data.js";
import { createControlPlaneHttpClient, ControlPlaneTransportErrorCode } from "./http-client.js";
import { createControlPlaneHttpHandler } from "./http-handler.js";
import { createReferenceControlPlane } from "./reference.js";
import {
  ControlPlaneCapability,
  ControlPlaneOperation,
  ControlPlaneOperationStatus
} from "./types.js";

const endpoint = "https://control.example/v1/control-plane";

it("round-trips typed commits and reads through only the Fetch contract", async () => {
  const reference = createReferenceControlPlane(
    referenceOptions({
      grants: [
        grant(ControlPlaneCapability.DocumentCommit, "document-1"),
        grant(ControlPlaneCapability.DocumentRead, "document-1")
      ]
    })
  );
  const client = createControlPlaneHttpClient(endpoint, {
    fetch: handlerFetch(createControlPlaneHttpHandler(reference.service))
  });
  const committed = await client.commitDocument({
    ...metadata(ControlPlaneOperation.DocumentCommit),
    document: document(),
    objectId: "document-1"
  });
  const read = await client.readDocument({
    ...metadata(ControlPlaneOperation.DocumentRead, "request-2"),
    objectId: "document-1"
  });
  expect(committed.value?.revision).toBe("revision-1");
  expect(read.value).toEqual(committed.value);
});

it("preserves safe non-success results instead of treating HTTP status as a network error", async () => {
  const reference = createReferenceControlPlane(referenceOptions());
  const client = createControlPlaneHttpClient(endpoint, {
    fetch: handlerFetch(createControlPlaneHttpHandler(reference.service))
  });
  await expect(
    client.readDocument({
      ...metadata(ControlPlaneOperation.DocumentRead),
      objectId: "document-1"
    })
  ).resolves.toMatchObject({ status: ControlPlaneOperationStatus.Denied });
});

it("rejects invalid requests before fetch", async () => {
  const fetchPort = vi.fn<typeof fetch>();
  const client = createControlPlaneHttpClient(endpoint, { fetch: fetchPort });
  await expect(
    client.readDocument({
      ...metadata(ControlPlaneOperation.DocumentRead),
      objectId: ""
    })
  ).rejects.toMatchObject({ code: ControlPlaneTransportErrorCode.InvalidRequest });
  expect(fetchPort).not.toHaveBeenCalled();
});

it("rejects malformed or status-mismatched responses", async () => {
  const malformed = createControlPlaneHttpClient(endpoint, {
    fetch: async () =>
      new Response("private proxy page", {
        headers: { "Content-Type": "text/html" },
        status: 502
      })
  });
  await expect(
    malformed.createBackup(metadata(ControlPlaneOperation.BackupCreate))
  ).rejects.toMatchObject({ code: ControlPlaneTransportErrorCode.InvalidResponse });

  const mismatch = createControlPlaneHttpClient(endpoint, {
    fetch: async () =>
      new Response(
        JSON.stringify({
          status: ControlPlaneOperationStatus.Succeeded,
          value: { backupId: "backup-1" }
        }),
        { headers: { "Content-Type": "application/json" }, status: 409 }
      )
  });
  await expect(
    mismatch.createBackup(metadata(ControlPlaneOperation.BackupCreate))
  ).rejects.toMatchObject({ code: ControlPlaneTransportErrorCode.InvalidResponse });
});

it("bounds response bytes", async () => {
  const oversized = createControlPlaneHttpClient(endpoint, {
    fetch: async () =>
      new Response("x".repeat(1025), {
        headers: { "Content-Type": "application/json" }
      }),
    maximumResponseBytes: 1024
  });
  await expect(
    oversized.createBackup(metadata(ControlPlaneOperation.BackupCreate))
  ).rejects.toMatchObject({ code: ControlPlaneTransportErrorCode.ResponseTooLarge });
});

it("classifies cancellation without leaking network causes", async () => {
  const controller = new AbortController();
  controller.abort();
  const aborted = createControlPlaneHttpClient(endpoint, {
    fetch: async () => {
      throw new Error("private network message");
    }
  });
  await expect(
    aborted.invokeEffect(
      {
        ...metadata(ControlPlaneOperation.EffectInvoke),
        effectId: "orders.submit",
        idempotencyKey: "effect-1",
        input: null,
        objectId: "document-1"
      },
      controller.signal
    )
  ).rejects.toMatchObject({ code: ControlPlaneTransportErrorCode.Aborted });
});

function handlerFetch(handler: (request: Request) => Promise<Response>): typeof fetch {
  return async (input, init) => handler(new Request(input, init));
}
